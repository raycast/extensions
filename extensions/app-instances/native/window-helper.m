#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>

@interface WindowItem : NSObject
@property (nonatomic, copy) NSString *appName;
@property (nonatomic, copy) NSString *appPath;
@property (nonatomic, copy) NSString *bundleId;
@property (nonatomic, assign) pid_t pid;
@property (nonatomic, assign) NSInteger windowIndex;
@property (nonatomic, copy) NSString *windowTitle;
@property (nonatomic, assign) BOOL isMinimized;
@end

@implementation WindowItem
- (NSDictionary *)toDictionary {
    return @{
        @"appName": self.appName ?: @"Unknown",
        @"appPath": self.appPath ?: @"",
        @"bundleId": self.bundleId ?: @"",
        @"pid": @(self.pid),
        @"windowIndex": @(self.windowIndex),
        @"windowTitle": self.windowTitle ?: @"",
        @"isMinimized": @(self.isMinimized)
    };
}
@end

static void listWindows(void) {
    NSArray<NSRunningApplication *> *apps = [[NSWorkspace sharedWorkspace] runningApplications];
    NSMutableArray<NSRunningApplication *> *targetApps = [NSMutableArray array];

    for (NSRunningApplication *app in apps) {
        if (app.activationPolicy == NSApplicationActivationPolicyRegular && app.processIdentifier > 0) {
            [targetApps addObject:app];
        }
    }

    NSUInteger total = targetApps.count;
    NSMutableArray<NSDictionary *> *results = [NSMutableArray array];
    NSLock *lock = [[NSLock alloc] init];

    // Query applications concurrently across available CPU cores
    dispatch_apply(total, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^(size_t i) {
        NSRunningApplication *app = targetApps[i];
        pid_t pid = app.processIdentifier;
        NSString *appName = app.localizedName ?: @"Unknown";
        NSString *appPath = app.bundleURL ? app.bundleURL.path : @"";
        NSString *bundleId = app.bundleIdentifier ?: @"";

        AXUIElementRef appRef = AXUIElementCreateApplication(pid);
        if (!appRef) return;

        // Set short timeout to prevent slow or unresponsive applications from stalling the list
        AXUIElementSetMessagingTimeout(appRef, 0.18);

        CFArrayRef windows = NULL;
        AXError err = AXUIElementCopyAttributeValue(appRef, kAXWindowsAttribute, (CFTypeRef *)&windows);
        if (err == kAXErrorSuccess && windows != NULL) {
            CFIndex count = CFArrayGetCount(windows);
            for (CFIndex wIdx = 0; wIdx < count; wIdx++) {
                AXUIElementRef win = (AXUIElementRef)CFArrayGetValueAtIndex(windows, wIdx);

                // Window Title
                CFStringRef titleRef = NULL;
                AXUIElementCopyAttributeValue(win, kAXTitleAttribute, (CFTypeRef *)&titleRef);
                NSString *title = (__bridge NSString *)titleRef;

                // Minimized state
                BOOL isMinimized = NO;
                CFBooleanRef minRef = NULL;
                if (AXUIElementCopyAttributeValue(win, kAXMinimizedAttribute, (CFTypeRef *)&minRef) == kAXErrorSuccess && minRef) {
                    isMinimized = CFBooleanGetValue(minRef);
                    CFRelease(minRef);
                }

                // Subrole / Role check (exclude tooltips, popups, system menus)
                CFStringRef subroleRef = NULL;
                AXUIElementCopyAttributeValue(win, kAXSubroleAttribute, (CFTypeRef *)&subroleRef);
                NSString *subrole = (__bridge NSString *)subroleRef;

                BOOL isStandardWindow = YES;
                if (subrole && ([subrole isEqualToString:@"AXSystemDialog"] || [subrole isEqualToString:@"AXUnknown"])) {
                    // Still show standard dialogs, skip unknown non-window roles if no title
                    if (!title || title.length == 0) {
                        isStandardWindow = NO;
                    }
                }
                if (subroleRef) CFRelease(subroleRef);

                if (isStandardWindow && title && title.length > 0) {
                    WindowItem *item = [[WindowItem alloc] init];
                    item.appName = appName;
                    item.appPath = appPath;
                    item.bundleId = bundleId;
                    item.pid = pid;
                    item.windowIndex = wIdx;
                    item.windowTitle = title;
                    item.isMinimized = isMinimized;

                    NSDictionary *dict = [item toDictionary];
                    [lock lock];
                    [results addObject:dict];
                    [lock unlock];
                }

                if (titleRef) CFRelease(titleRef);
            }
            CFRelease(windows);
        }
        CFRelease(appRef);
    });

    // Sort alphabetically by appName, then windowTitle
    [results sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) {
        NSComparisonResult cmp = [a[@"appName"] localizedCaseInsensitiveCompare:b[@"appName"]];
        if (cmp != NSOrderedSame) return cmp;
        return [a[@"windowTitle"] localizedCaseInsensitiveCompare:b[@"windowTitle"]];
    }];

    NSError *error = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:results options:0 error:&error];
    if (jsonData) {
        fwrite(jsonData.bytes, 1, jsonData.length, stdout);
        fputc('\n', stdout);
    }
}

static BOOL focusWindow(pid_t pid, NSInteger targetIndex, NSString *expectedTitle) {
    NSRunningApplication *app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
    if (!app) return NO;

    // Activate the application
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [app activateWithOptions:NSApplicationActivateIgnoringOtherApps];
#pragma clang diagnostic pop

    AXUIElementRef appRef = AXUIElementCreateApplication(pid);
    if (!appRef) return YES;

    AXUIElementSetMessagingTimeout(appRef, 0.25);

    CFArrayRef windows = NULL;
    AXError err = AXUIElementCopyAttributeValue(appRef, kAXWindowsAttribute, (CFTypeRef *)&windows);
    if (err == kAXErrorSuccess && windows != NULL) {
        CFIndex count = CFArrayGetCount(windows);
        AXUIElementRef targetWin = NULL;

        // Try exact index first if title matches or no expected title
        if (targetIndex >= 0 && targetIndex < count) {
            AXUIElementRef candidate = (AXUIElementRef)CFArrayGetValueAtIndex(windows, targetIndex);
            if (expectedTitle.length > 0) {
                CFStringRef tRef = NULL;
                AXUIElementCopyAttributeValue(candidate, kAXTitleAttribute, (CFTypeRef *)&tRef);
                NSString *title = (__bridge NSString *)tRef;
                if ([title isEqualToString:expectedTitle]) {
                    targetWin = candidate;
                }
                if (tRef) CFRelease(tRef);
            } else {
                targetWin = candidate;
            }
        }

        // Search by title if index didn't match
        if (!targetWin && expectedTitle.length > 0) {
            for (CFIndex i = 0; i < count; i++) {
                AXUIElementRef candidate = (AXUIElementRef)CFArrayGetValueAtIndex(windows, i);
                CFStringRef tRef = NULL;
                AXUIElementCopyAttributeValue(candidate, kAXTitleAttribute, (CFTypeRef *)&tRef);
                NSString *title = (__bridge NSString *)tRef;
                if ([title isEqualToString:expectedTitle]) {
                    targetWin = candidate;
                    if (tRef) CFRelease(tRef);
                    break;
                }
                if (tRef) CFRelease(tRef);
            }
        }

        if (targetWin) {
            // Restore if minimized
            AXUIElementSetAttributeValue(targetWin, kAXMinimizedAttribute, kCFBooleanFalse);
            // Raise window to front
            AXUIElementPerformAction(targetWin, kAXRaiseAction);
            // Set focused & main
            AXUIElementSetAttributeValue(targetWin, kAXMainAttribute, kCFBooleanTrue);
            AXUIElementSetAttributeValue(targetWin, kAXFocusedAttribute, kCFBooleanTrue);
        }

        CFRelease(windows);
    }
    CFRelease(appRef);
    return YES;
}

static BOOL closeWindow(pid_t pid, NSInteger targetIndex, NSString *expectedTitle) {
    AXUIElementRef appRef = AXUIElementCreateApplication(pid);
    if (!appRef) return NO;

    AXUIElementSetMessagingTimeout(appRef, 0.25);

    CFArrayRef windows = NULL;
    AXError err = AXUIElementCopyAttributeValue(appRef, kAXWindowsAttribute, (CFTypeRef *)&windows);
    if (err == kAXErrorSuccess && windows != NULL) {
        CFIndex count = CFArrayGetCount(windows);
        AXUIElementRef targetWin = NULL;

        if (targetIndex >= 0 && targetIndex < count) {
            targetWin = (AXUIElementRef)CFArrayGetValueAtIndex(windows, targetIndex);
        }

        if (targetWin) {
            AXUIElementRef closeButton = NULL;
            AXError bErr = AXUIElementCopyAttributeValue(targetWin, kAXCloseButtonAttribute, (CFTypeRef *)&closeButton);
            if (bErr == kAXErrorSuccess && closeButton) {
                AXUIElementPerformAction(closeButton, kAXPressAction);
                CFRelease(closeButton);
            }
        }
        CFRelease(windows);
    }
    CFRelease(appRef);
    return YES;
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc >= 2 && strcmp(argv[1], "list") == 0) {
            listWindows();
            return 0;
        } else if (argc >= 4 && strcmp(argv[1], "focus") == 0) {
            pid_t pid = (pid_t)atoi(argv[2]);
            NSInteger idx = (NSInteger)atoi(argv[3]);
            NSString *title = argc >= 5 ? [NSString stringWithUTF8String:argv[4]] : @"";
            focusWindow(pid, idx, title);
            return 0;
        } else if (argc >= 4 && strcmp(argv[1], "close") == 0) {
            pid_t pid = (pid_t)atoi(argv[2]);
            NSInteger idx = (NSInteger)atoi(argv[3]);
            NSString *title = argc >= 5 ? [NSString stringWithUTF8String:argv[4]] : @"";
            closeWindow(pid, idx, title);
            return 0;
        } else {
            fprintf(stderr, "Usage: %s list | focus <pid> <index> [title] | close <pid> <index> [title]\n", argv[0]);
            return 1;
        }
    }
    return 0;
}
