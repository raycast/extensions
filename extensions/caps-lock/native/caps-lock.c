#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <unistd.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/hidsystem/IOHIDLib.h>
#include <IOKit/hidsystem/IOHIDParameter.h>

// Every helper process for this user must lock the same inode before reading
// or changing the state. Never unlink it: waiters may still hold it open.
static int acquire_lock(void) {
    char directory[PATH_MAX];
    size_t length = confstr(_CS_DARWIN_USER_TEMP_DIR, directory, sizeof(directory));
    if (length == 0 || length > sizeof(directory)) {
        fprintf(stderr, "Cannot locate the user's temporary directory\n");
        return -1;
    }
    char path[PATH_MAX];
    int written = snprintf(path, sizeof(path), "%s/com.raycast.caps-lock.lock", directory);
    if (written < 0 || (size_t)written >= sizeof(path)) {
        fprintf(stderr, "Caps Lock lock path is too long\n");
        return -1;
    }
    int descriptor = open(path, O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW, 0600);
    if (descriptor == -1) {
        perror("Cannot open Caps Lock lock");
        return -1;
    }
    struct stat info;
    if (fstat(descriptor, &info) == -1 || !S_ISREG(info.st_mode) ||
        info.st_uid != geteuid() || info.st_nlink != 1) {
        fprintf(stderr, "Caps Lock lock is not a regular file owned by this user\n");
        close(descriptor);
        return -1;
    }
    while (flock(descriptor, LOCK_EX) == -1) {
        if (errno == EINTR) {
            continue;
        }
        perror("Cannot acquire Caps Lock lock");
        close(descriptor);
        return -1;
    }
    return descriptor;
}

// Change the actual modifier lock, without synthesizing a key press or
// changing the user's Caps Lock / Hyper Key mappings.
static int run_command(const char *command) {
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
    if (strcmp(command, "state")) {
        bool target = !strcmp(command, "toggle") ? !state : !strcmp(command, "on");
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

int main(int argc, char *argv[]) {
    if (argc != 2 || (strcmp(argv[1], "toggle") && strcmp(argv[1], "state") &&
                      strcmp(argv[1], "off") && strcmp(argv[1], "on"))) {
        fprintf(stderr, "Usage: caps-lock toggle|state|off|on\n");
        return 1;
    }
    int lock = acquire_lock();
    if (lock == -1) {
        return 1;
    }
    int result = run_command(argv[1]);
    // Closing (including on process exit) releases the lock for the next run.
    close(lock);
    return result;
}
