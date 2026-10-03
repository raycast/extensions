#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/hidsystem/IOHIDLib.h>
#include <IOKit/hidsystem/IOHIDParameter.h>

// Change the actual modifier lock, without synthesizing a key press or
// changing the user's Caps Lock / Hyper Key mappings.
int main(int argc, char *argv[]) {
    if (argc != 2 || (strcmp(argv[1], "toggle") && strcmp(argv[1], "state") &&
                      strcmp(argv[1], "off") && strcmp(argv[1], "on"))) {
        fprintf(stderr, "Usage: caps-lock toggle|state|off|on\n");
        return 1;
    }

    io_service_t service = IOServiceGetMatchingService(
        kIOMainPortDefault, IOServiceMatching(kIOHIDSystemClass));
    if (!service) {
        fprintf(stderr, "macOS keyboard service is unavailable\n");
        return 1;
    }
    io_connect_t connection = IO_OBJECT_NULL;
    kern_return_t result = IOServiceOpen(
        service, mach_task_self(), kIOHIDParamConnectType, &connection);
    IOObjectRelease(service);
    if (result != KERN_SUCCESS) {
        fprintf(stderr, "Cannot open macOS keyboard service: 0x%x\n", result);
        return 1;
    }

    bool state = false;
    result = IOHIDGetModifierLockState(connection, kIOHIDCapsLockState, &state);
    if (result != KERN_SUCCESS) {
        fprintf(stderr, "Cannot read Caps Lock: 0x%x\n", result);
        IOServiceClose(connection);
        return 1;
    }
    if (strcmp(argv[1], "state")) {
        bool target = !strcmp(argv[1], "toggle") ? !state : !strcmp(argv[1], "on");
        result = IOHIDSetModifierLockState(connection, kIOHIDCapsLockState, target);
        if (result == KERN_SUCCESS) {
            result = IOHIDGetModifierLockState(connection, kIOHIDCapsLockState, &state);
        }
        if (result != KERN_SUCCESS || state != target) {
            fprintf(stderr, "macOS did not confirm the requested Caps Lock state (0x%x)\n", result);
            IOServiceClose(connection);
            return 1;
        }
    }
    IOServiceClose(connection);
    puts(state ? "on" : "off");
    return 0;
}
