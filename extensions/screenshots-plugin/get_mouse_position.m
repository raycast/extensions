#import <Cocoa/Cocoa.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // 获取当前鼠标位置
        NSPoint mouseLocation = [NSEvent mouseLocation];
        printf("%.0f,%.0f\n", mouseLocation.x, mouseLocation.y);
    }
    return 0;
}