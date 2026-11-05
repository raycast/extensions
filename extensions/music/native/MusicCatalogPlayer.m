#import <Foundation/Foundation.h>
#import <objc/message.h>
#import <dlfcn.h>
#import <signal.h>
#import <stdatomic.h>

// These MediaPlayer entry points exist at runtime, but are not public macOS SDK APIs.
// Keep all checks here and fail explicitly: never fall back to opening a Music URL.
static NSString *resultPath;
static NSString *songID;
static pid_t parentPID;
static atomic_bool finished = false;
static atomic_bool playbackAttempted = false;
static id player;
static dispatch_source_t parentWatch;

static BOOL requestIsAlive(void) {
  return kill(parentPID, 0) == 0 &&
    [[NSFileManager defaultManager] fileExistsAtPath:resultPath.stringByDeletingLastPathComponent];
}

__attribute__((noreturn)) static void finish(NSString *status, NSString *message, int code) {
  if (atomic_exchange(&finished, true)) _Exit(code);
  @autoreleasepool {
    NSDictionary *result = @{
      @"status": status, @"songId": songID ?: @"",
      @"playbackAttempted": @(atomic_load(&playbackAttempted)),
      @"message": message ?: @""
    };
    NSData *data = [NSJSONSerialization dataWithJSONObject:result options:0 error:NULL];
    if (data && resultPath) [data writeToFile:resultPath options:NSDataWritingAtomic error:NULL];
    exit(code);
  }
}

static void startPlayback(void) {
  if (!requestIsAlive()) finish(@"error", @"The playback request was cancelled.", 2);
  @try {
    Class cls = NSClassFromString(@"MPMusicPlayerController");
    SEL systemPlayer = NSSelectorFromString(@"systemMusicPlayer");
    if (!cls || ![cls respondsToSelector:systemPlayer])
      finish(@"error", @"Native catalog playback is unavailable on this macOS version.", 3);
    player = ((id (*)(id, SEL))objc_msgSend)(cls, systemPlayer);
    SEL setQueue = NSSelectorFromString(@"setQueueWithStoreIDs:");
    SEL prepare = NSSelectorFromString(@"prepareToPlayWithCompletionHandler:");
    SEL play = NSSelectorFromString(@"play");
    if (!player || ![player respondsToSelector:setQueue] ||
        ![player respondsToSelector:prepare] || ![player respondsToSelector:play])
      finish(@"error", @"Music does not support the required native playback methods.", 3);
    atomic_store(&playbackAttempted, true);
    ((void (*)(id, SEL, id))objc_msgSend)(player, setQueue, @[songID]);
    ((void (*)(id, SEL, void (^)(NSError *)))objc_msgSend)(player, prepare, ^(NSError *error) {
      dispatch_async(dispatch_get_main_queue(), ^{
        @try {
          if (!requestIsAlive()) finish(@"error", @"The playback request was cancelled.", 2);
          if (error) finish(@"error", error.localizedDescription, 4);
          ((void (*)(id, SEL))objc_msgSend)(player, play);
          // Keep the IPC client alive while Music receives the command.
          // The extension independently verifies metadata and advancing playback via AppleScript.
          dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 4 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
            finish(@"started", nil, 0);
          });
        } @catch (NSException *exception) {
          finish(@"error", exception.reason, 5);
        }
      });
    });
  } @catch (NSException *exception) {
    finish(@"error", exception.reason, 5);
  }
}

int main(int argc, const char **argv) {
  @autoreleasepool {
    if (argc != 4) return 64;
    songID = [NSString stringWithUTF8String:argv[1]];
    resultPath = [NSString stringWithUTF8String:argv[2]];
    NSString *pidText = [NSString stringWithUTF8String:argv[3]];
    NSCharacterSet *notDigits = [[NSCharacterSet characterSetWithCharactersInString:@"0123456789"] invertedSet];
    if (!songID.length || [songID rangeOfCharacterFromSet:notDigits].location != NSNotFound ||
        !pidText.length || [pidText rangeOfCharacterFromSet:notDigits].location != NSNotFound ||
        !resultPath.isAbsolutePath) return 64;
    long long pidValue = pidText.longLongValue;
    if (pidValue <= 1 || pidValue > INT_MAX) return 64;
    parentPID = (pid_t)pidValue;
    if (!requestIsAlive()) return 2;

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 90 * NSEC_PER_SEC), dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
      finish(@"error", @"Native Music playback timed out.", 6);
    });
    parentWatch = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_global_queue(QOS_CLASS_UTILITY, 0));
    dispatch_source_set_timer(parentWatch, dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), NSEC_PER_SEC, NSEC_PER_SEC / 10);
    dispatch_source_set_event_handler(parentWatch, ^{
      if (!requestIsAlive()) finish(@"error", @"The playback request was cancelled.", 2);
    });
    dispatch_resume(parentWatch);

    if (!dlopen("/System/Library/Frameworks/MediaPlayer.framework/MediaPlayer", RTLD_NOW))
      finish(@"error", @"MediaPlayer is unavailable.", 3);
    Class library = NSClassFromString(@"MPMediaLibrary");
    SEL statusSelector = NSSelectorFromString(@"authorizationStatus");
    SEL requestSelector = NSSelectorFromString(@"requestAuthorization:");
    if (!library || ![library respondsToSelector:statusSelector] || ![library respondsToSelector:requestSelector])
      finish(@"error", @"Music authorization is unavailable on this macOS version.", 3);
    @try {
      NSInteger status = ((NSInteger (*)(id, SEL))objc_msgSend)(library, statusSelector);
      if (status == 3) {
        startPlayback();
      } else if (status == 0) {
        ((void (*)(id, SEL, void (^)(NSInteger)))objc_msgSend)(library, requestSelector, ^(NSInteger authorization) {
          dispatch_async(dispatch_get_main_queue(), ^{
            if (authorization == 3) startPlayback();
            else finish(@"error", @"Allow Music access for Raycast Music Player in System Settings > Privacy & Security > Media & Apple Music.", 7);
          });
        });
      } else {
        finish(@"error", @"Music access is denied or restricted. Check System Settings > Privacy & Security > Media & Apple Music.", 7);
      }
    } @catch (NSException *exception) {
      finish(@"error", exception.reason, 5);
    }
    CFRunLoopRun();
  }
  return 0;
}
