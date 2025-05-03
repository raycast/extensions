#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>

@class BrightnessSystemClient;

@interface KeyboardBrightnessClient : NSObject

- (void)registerNotificationForKeys:(id _Nonnull)arg1 keyboardID:(unsigned long long)arg2 block:(void)arg3;
- (void)unregisterKeyboardNotificationBlock;
- (BOOL)isAutoBrightnessEnabledForKeyboard:(unsigned long long)arg1;
- (BOOL)setIdleDimTime:(double)arg1 forKeyboard:(unsigned long long)arg2;
- (double)idleDimTimeForKeyboard:(unsigned long long)arg1;
- (BOOL)isKeyboardBuiltIn:(unsigned long long)arg1;
- (BOOL)isAmbientFeatureAvailableOnKeyboard:(unsigned long long)arg1;
- (BOOL)enableAutoBrightness:(BOOL)arg1 forKeyboard:(unsigned long long)arg2;
- (BOOL)setBrightness:(float)arg1 forKeyboard:(unsigned long long)arg2;
- (float)brightnessForKeyboard:(unsigned long long)arg1;
- (BOOL)isBacklightDimmedOnKeyboard:(unsigned long long)arg1;
- (BOOL)isBacklightSaturatedOnKeyboard:(unsigned long long)arg1;
- (BOOL)isBacklightSuppressedOnKeyboard:(unsigned long long)arg1;
- (NSArray<NSNumber*> * _Nullable)copyKeyboardBacklightIDs;
- (void)dealloc;
- (id _Nonnull)init;

@end
