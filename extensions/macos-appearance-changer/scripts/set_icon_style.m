// Sets the macOS icon appearance style via private SkyLight API.
// Usage: set_icon_style <iconAppearanceTheme>
//
// iconAppearanceTheme values:
//   0 = Regular Dark (colorful on dark bg)
//   1 = Regular Light / Default (colorful on blue bg)
//   3 = Clear Dark (gray glass on dark bg)
//   4 = Clear Light (gray glass on gray bg)
//   6 = Tinted Dark (blue monochrome on dark blue bg)
//   7 = Tinted Light (blue monochrome on blue bg)
//
// Compile: clang -framework Foundation -framework AppKit -ldl -fobjc-arc -o set_icon_style set_icon_style.m

#import <Foundation/Foundation.h>
#import <dlfcn.h>
#import <objc/runtime.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc < 2) {
            fprintf(stderr, "Usage: set_icon_style <iconAppearanceTheme>\n");
            return 1;
        }

        int iat = atoi(argv[1]);

        void *handle = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY);
        if (!handle) {
            fprintf(stderr, "Failed to load SkyLight.framework\n");
            return 1;
        }

        Class configClass = objc_getClass("SLSIconAppearanceConfiguration");
        if (!configClass) {
            fprintf(stderr, "SLSIconAppearanceConfiguration not found\n");
            return 1;
        }

        id config = [[configClass alloc] init];

        SEL setIAT = NSSelectorFromString(@"setIconAppearanceTheme:");
        if ([config respondsToSelector:setIAT]) {
            ((void (*)(id, SEL, long long))objc_msgSend)(config, setIAT, (long long)iat);
        }

        // Apply the configuration
        SEL applySel = NSSelectorFromString(@"applyConfiguration");
        if ([config respondsToSelector:applySel]) {
            ((void (*)(id, SEL))objc_msgSend)(config, applySel);
        } else {
            // Fallback: try class method setCurrentConfiguration:
            SEL setCurrent = NSSelectorFromString(@"setCurrentConfiguration:");
            if ([configClass respondsToSelector:setCurrent]) {
                ((void (*)(id, SEL, id))objc_msgSend)(configClass, setCurrent, config);
            }
        }

        printf("Set iconAppearanceTheme=%d\n", iat);
    }
    return 0;
}
