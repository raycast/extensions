#import "HDRCore.h"
#import <Foundation/Foundation.h>
#import <unistd.h>

// Private framework, no public headers. The selectors below are stable across
// macOS 13–26 and are the same ones BetterDisplay and DisplaySync use.
@interface MPDisplay : NSObject
@property(readonly) int displayID;
@property(readonly, nullable) NSString *displayName;
@property(readonly, nullable) NSUUID *uuid;
@property(readonly) BOOL isBuiltIn;
@property(readonly) BOOL hasHDRModes;
- (BOOL)preferHDRModes;
- (void)setPreferHDRModes:(BOOL)enabled;
@end

@interface MPDisplayMgr : NSObject
@property(readonly, nullable) NSArray<MPDisplay *> *displays;
@end

static MPDisplay *findDisplay(int displayID) {
  for (MPDisplay *display in [MPDisplayMgr new].displays) {
    if (display.displayID == displayID) return display;
  }
  return nil;
}

char *hdr_list_json(void) {
  NSMutableArray *result = [NSMutableArray array];

  for (MPDisplay *display in [MPDisplayMgr new].displays) {
    BOOL hdr = display.hasHDRModes ? display.preferHDRModes : NO;
    [result addObject:@{
      @"id" : @(display.displayID),
      @"name" : display.displayName ?: @"Unknown",
      @"uuid" : display.uuid.UUIDString ?: @"",
      @"builtin" : display.isBuiltIn ? @YES : @NO,
      @"hdrCapable" : display.hasHDRModes ? @YES : @NO,
      @"hdr" : hdr ? @YES : @NO,
    }];
  }

  NSData *data = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
  NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  if (json == nil) return strdup("[]");
  return strdup(json.UTF8String);
}

int hdr_set(int display_id, int value) {
  MPDisplay *display = findDisplay(display_id);
  if (display == nil || !display.hasHDRModes) return -1;

  BOOL want = value == 2 ? !display.preferHDRModes : value == 1;
  [display setPreferHDRModes:want];

  for (int attempt = 0; attempt < 50; attempt++) {
    if (display.preferHDRModes == want) return want ? 1 : 0;
    usleep(50000);
  }

  return -1;
}

void hdr_free(char *value) {
  free(value);
}
