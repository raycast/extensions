// hdrctl — read and change HDR state on macOS through the private
// MonitorPanel framework. Public headers for this framework do not exist;
// the interfaces below are declared by hand. See CONTRACT.md.

#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

#include <errno.h>
#include <limits.h>
#include <signal.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

#pragma mark - Private MonitorPanel interfaces

@interface MPDisplay : NSObject
@property(readonly) int displayID;
@property(readonly, nullable) NSString *displayName;
@property(readonly) BOOL isBuiltIn;
@property(readonly) BOOL hasHDRModes;
- (BOOL)preferHDRModes;
- (void)setPreferHDRModes:(BOOL)enabled;
@end

@interface MPDisplayMgr : NSObject
@property(readonly, nullable) NSArray<MPDisplay *> *displays;
- (nullable MPDisplay *)displayWithID:(int)displayID;
@end

#pragma mark - Diagnostics

// Every diagnostic is one stderr line with this prefix. stdout is reserved
// for the contract's state words and JSON.
static int Fail(int code, NSString *format, ...) {
  va_list arguments;
  va_start(arguments, format);
  NSString *message = [[NSString alloc] initWithFormat:format arguments:arguments];
  va_end(arguments);
  fprintf(stderr, "hdrctl: %s\n", message.UTF8String);
  return code;
}

static void PrintUsage(void) {
  fprintf(stderr,
          "hdrctl: usage: hdrctl list [--json] | hdrctl get [selector] | "
          "hdrctl set [selector] --value on|off|toggle [--wait ms] | "
          "hdrctl watch --rules <path>\n");
}

#pragma mark - Displays

static MPDisplayMgr *NewDisplayManager(void) {
  Class managerClass = NSClassFromString(@"MPDisplayMgr");
  if (managerClass == Nil) {
    return nil;
  }
  id manager = [[managerClass alloc] init];
  return (MPDisplayMgr *)manager;
}

static NSString *DisplayName(MPDisplay *display) {
  NSString *name = display.displayName;
  return name != nil ? name : @"";
}

static NSArray<MPDisplay *> *AllDisplays(MPDisplayMgr *manager) {
  NSArray<MPDisplay *> *displays = manager.displays;
  if (displays == nil) {
    return @[];
  }
  return [displays sortedArrayUsingComparator:^NSComparisonResult(MPDisplay *a, MPDisplay *b) {
    int left = a.displayID;
    int right = b.displayID;
    if (left < right) {
      return NSOrderedAscending;
    }
    if (left > right) {
      return NSOrderedDescending;
    }
    return NSOrderedSame;
  }];
}

// Returns every display whose name matches `name`: case-insensitive exact
// matches when there are any, otherwise case-insensitive substring matches.
static NSArray<MPDisplay *> *DisplaysMatchingName(NSArray<MPDisplay *> *displays, NSString *name) {
  NSMutableArray<MPDisplay *> *exact = [NSMutableArray array];
  for (MPDisplay *display in displays) {
    if ([DisplayName(display) caseInsensitiveCompare:name] == NSOrderedSame) {
      [exact addObject:display];
    }
  }
  if (exact.count > 0) {
    return exact;
  }

  NSMutableArray<MPDisplay *> *partial = [NSMutableArray array];
  for (MPDisplay *display in displays) {
    if ([DisplayName(display) rangeOfString:name options:NSCaseInsensitiveSearch].location != NSNotFound) {
      [partial addObject:display];
    }
  }
  return partial;
}

static NSString *DescribeDisplays(NSArray<MPDisplay *> *displays) {
  NSMutableArray<NSString *> *parts = [NSMutableArray array];
  for (MPDisplay *display in displays) {
    [parts addObject:[NSString stringWithFormat:@"\"%@\" (id %d)", DisplayName(display), display.displayID]];
  }
  return [parts componentsJoinedByString:@", "];
}

#pragma mark - Selector

@interface SelectorArgs : NSObject
@property(nonatomic) BOOL hasID;
@property(nonatomic) int displayID;
@property(nonatomic) BOOL hasName;
@property(nonatomic, copy) NSString *name;
@property(nonatomic) BOOL hasExternal;
@end

@implementation SelectorArgs
@end

static BOOL SelectorIsSet(SelectorArgs *selector) {
  return selector.hasID || selector.hasName || selector.hasExternal;
}

// Resolves a selector to a display. Returns 0 on success or the CLI exit code
// (2: no match/ambiguous, 3: matched but not HDR-capable).
static int ResolveDisplay(SelectorArgs *selector, MPDisplay **outDisplay, NSString **outError) {
  MPDisplayMgr *manager = NewDisplayManager();
  if (manager == nil) {
    *outError = @"MonitorPanel is unavailable";
    return 1;
  }

  NSArray<MPDisplay *> *displays = AllDisplays(manager);
  MPDisplay *chosen = nil;

  if (selector.hasID) {
    chosen = [manager displayWithID:selector.displayID];
    if (chosen == nil) {
      *outError = [NSString stringWithFormat:@"no display with id %d", selector.displayID];
      return 2;
    }
  } else if (selector.hasName) {
    NSArray<MPDisplay *> *matches = DisplaysMatchingName(displays, selector.name);
    if (matches.count == 0) {
      *outError = [NSString stringWithFormat:@"no display named \"%@\"", selector.name];
      return 2;
    }
    if (matches.count > 1) {
      *outError = [NSString stringWithFormat:@"display name \"%@\" is ambiguous; matches %@",
                                             selector.name, DescribeDisplays(matches)];
      return 2;
    }
    chosen = matches.firstObject;
  } else {
    // --external, also the default when no selector was given.
    for (MPDisplay *display in displays) {
      if (!display.isBuiltIn && display.hasHDRModes) {
        chosen = display;
        break;
      }
    }
    if (chosen == nil) {
      *outError = @"no external HDR-capable display found";
      return 2;
    }
  }

  if (!chosen.hasHDRModes) {
    *outError = [NSString stringWithFormat:@"display \"%@\" (id %d) does not support HDR",
                                           DisplayName(chosen), chosen.displayID];
    return 3;
  }

  *outDisplay = chosen;
  return 0;
}

#pragma mark - Argument helpers

static BOOL ParseIntValue(NSString *text, int *outValue) {
  if (text.length == 0) {
    return NO;
  }
  const char *string = text.UTF8String;
  if (string == NULL) {
    return NO;
  }
  errno = 0;
  char *end = NULL;
  long value = strtol(string, &end, 10);
  if (errno != 0 || end == string || *end != '\0') {
    return NO;
  }
  if (value < 0 || value > INT_MAX) {
    return NO;
  }
  *outValue = (int)value;
  return YES;
}

// Matches `--option` or `--option=value`; *inlineValue stays nil in the
// former case so the caller consumes the next argument.
static BOOL ParseLongOption(NSString *argument, NSString *option, NSString **inlineValue) {
  if ([argument isEqualToString:option]) {
    *inlineValue = nil;
    return YES;
  }
  NSString *prefix = [option stringByAppendingString:@"="];
  if ([argument hasPrefix:prefix]) {
    *inlineValue = [argument substringFromIndex:prefix.length];
    return YES;
  }
  return NO;
}

static BOOL TakeOptionValue(NSArray<NSString *> *arguments, NSUInteger *index,
                            NSString *inlineValue, NSString **outValue) {
  if (inlineValue != nil) {
    *outValue = inlineValue;
    return YES;
  }
  if (*index + 1 >= arguments.count) {
    return NO;
  }
  *index += 1;
  *outValue = arguments[*index];
  return YES;
}

static BOOL IsSelectorOption(NSString *argument) {
  return [argument isEqualToString:@"--external"] ||
         [argument isEqualToString:@"--id"] || [argument hasPrefix:@"--id="] ||
         [argument isEqualToString:@"--name"] || [argument hasPrefix:@"--name="];
}

// Returns NO with *outError set on bad input; callers report exit code 1.
static BOOL ParseSelectorOption(NSArray<NSString *> *arguments, NSUInteger *index,
                                NSString *argument, SelectorArgs *selector,
                                NSString **outError) {
  if ([argument isEqualToString:@"--external"]) {
    if (SelectorIsSet(selector)) {
      *outError = @"only one display selector may be given";
      return NO;
    }
    selector.hasExternal = YES;
    return YES;
  }

  NSString *inlineValue = nil;
  if (ParseLongOption(argument, @"--id", &inlineValue)) {
    if (SelectorIsSet(selector)) {
      *outError = @"only one display selector may be given";
      return NO;
    }
    NSString *value = nil;
    if (!TakeOptionValue(arguments, index, inlineValue, &value)) {
      *outError = @"--id needs a value";
      return NO;
    }
    int displayID = 0;
    if (!ParseIntValue(value, &displayID)) {
      *outError = [NSString stringWithFormat:@"invalid display id \"%@\"", value];
      return NO;
    }
    selector.hasID = YES;
    selector.displayID = displayID;
    return YES;
  }

  if (ParseLongOption(argument, @"--name", &inlineValue)) {
    if (SelectorIsSet(selector)) {
      *outError = @"only one display selector may be given";
      return NO;
    }
    NSString *value = nil;
    if (!TakeOptionValue(arguments, index, inlineValue, &value)) {
      *outError = @"--name needs a value";
      return NO;
    }
    if (value.length == 0) {
      *outError = @"--name needs a non-empty value";
      return NO;
    }
    selector.hasName = YES;
    selector.name = value;
    return YES;
  }

  *outError = [NSString stringWithFormat:@"unexpected argument \"%@\"", argument];
  return NO;
}

#pragma mark - list

static int CommandList(BOOL asJSON) {
  MPDisplayMgr *manager = NewDisplayManager();
  if (manager == nil) {
    return Fail(1, @"MonitorPanel is unavailable");
  }

  NSArray<MPDisplay *> *displays = AllDisplays(manager);

  if (!asJSON) {
    for (MPDisplay *display in displays) {
      printf("%d\t%s\t%s\t%s\t%s\n",
             display.displayID,
             DisplayName(display).UTF8String,
             display.isBuiltIn ? "builtin" : "external",
             display.hasHDRModes ? "hdr" : "no-hdr",
             display.preferHDRModes ? "on" : "off");
    }
    return 0;
  }

  NSMutableArray<NSDictionary *> *items = [NSMutableArray arrayWithCapacity:displays.count];
  for (MPDisplay *display in displays) {
    [items addObject:@{
      @"id" : @(display.displayID),
      @"name" : DisplayName(display),
      @"builtin" : @(display.isBuiltIn),
      @"hdrCapable" : @(display.hasHDRModes),
      @"hdr" : @(display.preferHDRModes),
    }];
  }

  NSError *error = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:items
                                                 options:(NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys)
                                                   error:&error];
  if (data == nil) {
    return Fail(1, @"could not serialize display list: %@", error.localizedDescription);
  }
  NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  printf("%s\n", json.UTF8String);
  return 0;
}

#pragma mark - get

static int CommandGet(SelectorArgs *selector) {
  MPDisplay *display = nil;
  NSString *error = nil;
  int code = ResolveDisplay(selector, &display, &error);
  if (code != 0) {
    return Fail(code, @"%@", error);
  }

  printf("%s\n", display.preferHDRModes ? "on" : "off");
  return 0;
}

#pragma mark - set

typedef NS_ENUM(NSInteger, SetValue) {
  SetValueOn,
  SetValueOff,
  SetValueToggle,
};

static double MonotonicSeconds(void) {
  struct timespec time;
  clock_gettime(CLOCK_MONOTONIC, &time);
  return (double)time.tv_sec + (double)time.tv_nsec / 1000000000.0;
}

static BOOL WaitForState(MPDisplay *display, BOOL desired, int timeoutMS) {
  double deadline = MonotonicSeconds() + (double)timeoutMS / 1000.0;
  for (;;) {
    if (display.preferHDRModes == desired) {
      return YES;
    }
    double now = MonotonicSeconds();
    if (now >= deadline) {
      return NO;
    }
    double remaining = deadline - now;
    double interval = remaining < 0.05 ? remaining : 0.05;
    [NSThread sleepForTimeInterval:interval];
  }
}

static int CommandSet(SelectorArgs *selector, SetValue value, int waitMS) {
  MPDisplay *display = nil;
  NSString *error = nil;
  int code = ResolveDisplay(selector, &display, &error);
  if (code != 0) {
    return Fail(code, @"%@", error);
  }

  BOOL desired = display.preferHDRModes;
  switch (value) {
    case SetValueOn:
      desired = YES;
      break;
    case SetValueOff:
      desired = NO;
      break;
    case SetValueToggle:
      desired = !display.preferHDRModes;
      break;
  }

  [display setPreferHDRModes:desired];

  // --wait 0 is fire-and-forget: report the requested state immediately.
  if (waitMS == 0) {
    printf("%s\n", desired ? "on" : "off");
    return 0;
  }

  BOOL reached = WaitForState(display, desired, waitMS);
  BOOL finalState = display.preferHDRModes;
  printf("%s\n", finalState ? "on" : "off");
  if (reached) {
    return 0;
  }
  return Fail(4, @"display \"%@\" did not reach \"%s\" within %d ms",
              DisplayName(display), desired ? "on" : "off", waitMS);
}

#pragma mark - watch

static NSString *WatchRulesPath = nil;
static NSTimer *WatchDebounceTimer = nil;
static volatile sig_atomic_t WatchTerminated = 0;

static BOOL LoadRules(NSString *path, NSArray **outRules, NSString **outError) {
  NSError *readError = nil;
  NSData *data = [NSData dataWithContentsOfFile:path options:0 error:&readError];
  if (data == nil) {
    *outError = [NSString stringWithFormat:@"cannot read rules file %@: %@",
                                           path, readError.localizedDescription ?: @"unknown error"];
    return NO;
  }
  if (data.length == 0) {
    *outError = [NSString stringWithFormat:@"rules file is empty: %@", path];
    return NO;
  }

  NSError *jsonError = nil;
  id root = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
  if (root == nil) {
    *outError = [NSString stringWithFormat:@"rules file is not valid JSON: %@",
                                           jsonError.localizedDescription ?: @"unknown error"];
    return NO;
  }
  if (![root isKindOfClass:[NSDictionary class]]) {
    *outError = [NSString stringWithFormat:@"rules file must contain a JSON object: %@", path];
    return NO;
  }

  id rules = ((NSDictionary *)root)[@"rules"];
  if (![rules isKindOfClass:[NSArray class]]) {
    *outError = [NSString stringWithFormat:@"rules file has no \"rules\" array: %@", path];
    return NO;
  }

  *outRules = rules;
  return YES;
}

// Re-reads the rules file on every call (never cached) and applies each rule.
// A missing, empty or malformed file terminates the watcher with status 0:
// launchd restarts it later.
static void ApplyRules(NSString *path) {
  NSArray *rules = nil;
  NSString *error = nil;
  if (!LoadRules(path, &rules, &error)) {
    fprintf(stderr, "hdrctl: watch: %s\n", error.UTF8String);
    fflush(stderr);
    exit(0);
  }

  MPDisplayMgr *manager = NewDisplayManager();
  if (manager == nil) {
    fprintf(stderr, "hdrctl: watch: MonitorPanel is unavailable\n");
    fflush(stderr);
    exit(0);
  }
  NSArray<MPDisplay *> *displays = AllDisplays(manager);

  for (id item in rules) {
    if (![item isKindOfClass:[NSDictionary class]]) {
      fprintf(stderr, "hdrctl: watch: skipping rule that is not an object\n");
      continue;
    }

    NSDictionary *rule = item;
    id displayValue = rule[@"display"];
    id hdrValue = rule[@"hdr"];
    if (![displayValue isKindOfClass:[NSString class]] ||
        ![hdrValue isKindOfClass:[NSNumber class]]) {
      fprintf(stderr, "hdrctl: watch: skipping malformed rule\n");
      continue;
    }

    NSString *name = displayValue;
    if (name.length == 0) {
      fprintf(stderr, "hdrctl: watch: skipping rule with an empty display name\n");
      continue;
    }
    BOOL desired = [hdrValue boolValue];

    NSArray<MPDisplay *> *matches = DisplaysMatchingName(displays, name);
    if (matches.count == 0) {
      continue;
    }
    if (matches.count > 1) {
      fprintf(stderr, "hdrctl: watch: \"%s\" is ambiguous (%lu displays match); skipping\n",
              name.UTF8String, (unsigned long)matches.count);
      continue;
    }

    MPDisplay *display = matches.firstObject;
    if (!display.hasHDRModes) {
      fprintf(stderr, "hdrctl: watch: \"%s\" does not support HDR; skipping\n",
              DisplayName(display).UTF8String);
      continue;
    }

    // Already in the desired state: no-op. This is what stops the watcher
    // from reacting to the display reconfiguration its own change causes.
    if (display.preferHDRModes == desired) {
      continue;
    }

    [display setPreferHDRModes:desired];
    fprintf(stderr, "hdrctl: watch: \"%s\" -> %s\n",
            DisplayName(display).UTF8String, desired ? "on" : "off");
    fflush(stderr);
  }
}

static void HandleTerminationSignal(int signalNumber) {
  (void)signalNumber;
  WatchTerminated = 1;
  CFRunLoopStop(CFRunLoopGetMain());
}

static void HandleDisplayReconfiguration(CGDirectDisplayID display,
                                         CGDisplayChangeSummaryFlags flags,
                                         void *userInfo) {
  (void)display;
  (void)userInfo;

  if ((flags & (kCGDisplayAddFlag | kCGDisplayEnabledFlag)) == 0) {
    return;
  }

  // Debounce: a display being added or enabled emits a burst of callbacks and
  // the hardware needs a moment to settle.
  [WatchDebounceTimer invalidate];
  WatchDebounceTimer = [NSTimer scheduledTimerWithTimeInterval:1.2
                                                       repeats:NO
                                                         block:^(NSTimer *timer) {
    (void)timer;
    ApplyRules(WatchRulesPath);
  }];
}

static int CommandWatch(NSString *rulesPath) {
  // Fail fast on a bad file instead of waiting through the startup delay.
  NSArray *rules = nil;
  NSString *error = nil;
  if (!LoadRules(rulesPath, &rules, &error)) {
    fprintf(stderr, "hdrctl: watch: %s\n", error.UTF8String);
    return 0;
  }

  WatchRulesPath = rulesPath;

  struct sigaction action;
  memset(&action, 0, sizeof(action));
  action.sa_handler = HandleTerminationSignal;
  sigemptyset(&action.sa_mask);
  action.sa_flags = 0;
  sigaction(SIGTERM, &action, NULL);
  sigaction(SIGINT, &action, NULL);

  // Give login a moment, apply the rules once, then start listening. The
  // reconfiguration caused by applying HDR lands after registration and is
  // absorbed by the already-in-desired-state check.
  [NSTimer scheduledTimerWithTimeInterval:2.0
                                  repeats:NO
                                    block:^(NSTimer *timer) {
    (void)timer;
    ApplyRules(WatchRulesPath);
    CGDisplayRegisterReconfigurationCallback(HandleDisplayReconfiguration, NULL);
  }];

  if (!WatchTerminated) {
    CFRunLoopRun();
  }
  return 0;
}

#pragma mark - main

int main(void) {
  @autoreleasepool {
    NSArray<NSString *> *arguments = [[NSProcessInfo processInfo] arguments];
    if (arguments.count < 2) {
      PrintUsage();
      return 1;
    }

    NSString *command = arguments[1];
    NSUInteger index = 2;

    if ([command isEqualToString:@"list"]) {
      BOOL asJSON = NO;
      for (; index < arguments.count; index++) {
        NSString *argument = arguments[index];
        if (![argument isEqualToString:@"--json"]) {
          return Fail(1, @"unexpected argument \"%@\" for list", argument);
        }
        if (asJSON) {
          return Fail(1, @"--json given more than once");
        }
        asJSON = YES;
      }
      return CommandList(asJSON);
    }

    if ([command isEqualToString:@"get"]) {
      SelectorArgs *selector = [[SelectorArgs alloc] init];
      for (; index < arguments.count; index++) {
        NSString *argument = arguments[index];
        if (!IsSelectorOption(argument)) {
          return Fail(1, @"unexpected argument \"%@\" for get", argument);
        }
        NSString *error = nil;
        if (!ParseSelectorOption(arguments, &index, argument, selector, &error)) {
          return Fail(1, @"%@", error);
        }
      }
      return CommandGet(selector);
    }

    if ([command isEqualToString:@"set"]) {
      SelectorArgs *selector = [[SelectorArgs alloc] init];
      BOOL hasValue = NO;
      SetValue value = SetValueOn;
      BOOL hasWait = NO;
      int waitMS = 2000;

      for (; index < arguments.count; index++) {
        NSString *argument = arguments[index];

        if (IsSelectorOption(argument)) {
          NSString *error = nil;
          if (!ParseSelectorOption(arguments, &index, argument, selector, &error)) {
            return Fail(1, @"%@", error);
          }
          continue;
        }

        NSString *inlineValue = nil;
        if (ParseLongOption(argument, @"--value", &inlineValue)) {
          if (hasValue) {
            return Fail(1, @"--value given more than once");
          }
          NSString *text = nil;
          if (!TakeOptionValue(arguments, &index, inlineValue, &text)) {
            return Fail(1, @"--value needs on, off or toggle");
          }
          if ([text caseInsensitiveCompare:@"on"] == NSOrderedSame) {
            value = SetValueOn;
          } else if ([text caseInsensitiveCompare:@"off"] == NSOrderedSame) {
            value = SetValueOff;
          } else if ([text caseInsensitiveCompare:@"toggle"] == NSOrderedSame) {
            value = SetValueToggle;
          } else {
            return Fail(1, @"invalid --value \"%@\"; expected on, off or toggle", text);
          }
          hasValue = YES;
          continue;
        }

        if (ParseLongOption(argument, @"--wait", &inlineValue)) {
          if (hasWait) {
            return Fail(1, @"--wait given more than once");
          }
          NSString *text = nil;
          if (!TakeOptionValue(arguments, &index, inlineValue, &text)) {
            return Fail(1, @"--wait needs a millisecond count");
          }
          if (!ParseIntValue(text, &waitMS)) {
            return Fail(1, @"invalid --wait \"%@\"; expected a non-negative integer", text);
          }
          hasWait = YES;
          continue;
        }

        return Fail(1, @"unexpected argument \"%@\" for set", argument);
      }

      if (!hasValue) {
        return Fail(1, @"set requires --value on|off|toggle");
      }
      return CommandSet(selector, value, waitMS);
    }

    if ([command isEqualToString:@"watch"]) {
      NSString *rulesPath = nil;
      for (; index < arguments.count; index++) {
        NSString *argument = arguments[index];
        NSString *inlineValue = nil;
        if (!ParseLongOption(argument, @"--rules", &inlineValue)) {
          return Fail(1, @"unexpected argument \"%@\" for watch", argument);
        }
        if (rulesPath != nil) {
          return Fail(1, @"--rules given more than once");
        }
        NSString *text = nil;
        if (!TakeOptionValue(arguments, &index, inlineValue, &text) || text.length == 0) {
          return Fail(1, @"watch requires --rules <path>");
        }
        rulesPath = text;
      }
      if (rulesPath == nil) {
        return Fail(1, @"watch requires --rules <path>");
      }
      return CommandWatch(rulesPath);
    }

    PrintUsage();
    return 1;
  }
}
