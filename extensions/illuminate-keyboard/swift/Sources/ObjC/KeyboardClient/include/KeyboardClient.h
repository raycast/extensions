#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>

@interface KeyboardBrightnessClient : NSObject

- (id _Nonnull)init;
- (float)brightnessForKeyboard:(unsigned long long)arg1;
- (BOOL)setBrightness:(float)arg1 forKeyboard:(unsigned long long)arg2;
- (BOOL)isAutoBrightnessEnabledForKeyboard:(unsigned long long)arg1;
- (BOOL)enableAutoBrightness:(BOOL)arg1 forKeyboard:(unsigned long long)arg2;
- (BOOL)isKeyboardBuiltIn:(unsigned long long)arg1;
- (BOOL)isBacklightDimmedOnKeyboard:(unsigned long long)arg1;
- (BOOL)isBacklightSuppressedOnKeyboard:(unsigned long long)arg1;
- (BOOL)isBacklightSaturatedOnKeyboard:(unsigned long long)arg1;
- (NSArray<NSNumber*> * _Nullable)copyKeyboardBacklightIDs;

@end
