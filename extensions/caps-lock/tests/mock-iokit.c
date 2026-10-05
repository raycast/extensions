// Link the real helper source against these file-backed APIs, never IOKit.
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/hidsystem/IOHIDLib.h>

const mach_port_t kIOMainPortDefault = MACH_PORT_NULL;

size_t caps_lock_test_confstr(int name, char *buffer, size_t size) {
    (void)name;
    const char *directory = getenv("CAPS_LOCK_TEST_DIRECTORY");
    if (!directory) {
        return 0;
    }
    if (size > 0) {
        snprintf(buffer, size, "%s", directory);
    }
    return strlen(directory) + 1;
}

static bool failure_is(const char *value) {
    const char *failure = getenv("CAPS_LOCK_TEST_FAILURE");
    return failure && !strcmp(failure, value);
}

CFMutableDictionaryRef IOServiceMatching(const char *name) {
    (void)name;
    return NULL;
}

io_service_t IOServiceGetMatchingService(mach_port_t port, CFDictionaryRef matching) {
    (void)port;
    (void)matching;
    return failure_is("service") ? IO_OBJECT_NULL : 1;
}

kern_return_t IOObjectRelease(io_object_t object) {
    (void)object;
    return KERN_SUCCESS;
}

kern_return_t IOServiceOpen(io_service_t service, task_port_t task, uint32_t type, io_connect_t *connection) {
    (void)service;
    (void)task;
    (void)type;
    *connection = 1;
    return failure_is("open") ? KERN_FAILURE : KERN_SUCCESS;
}

kern_return_t IOServiceClose(io_connect_t connection) {
    (void)connection;
    return KERN_SUCCESS;
}

kern_return_t IOHIDGetModifierLockState(io_connect_t connection, int selector, bool *state) {
    (void)connection;
    (void)selector;
    if (failure_is("read")) {
        return KERN_FAILURE;
    }
    const char *marker = getenv("CAPS_LOCK_TEST_HOLD_MARKER");
    if (marker) {
        int file = open(marker, O_CREAT | O_WRONLY, 0600);
        if (file == -1) {
            return KERN_FAILURE;
        }
        close(file);
        for (;;) {
            pause();
        }
    }
    const char *path = getenv("CAPS_LOCK_TEST_STATE");
    if (!path) {
        return KERN_FAILURE;
    }
    int file = open(path, O_RDONLY);
    char value = '0';
    ssize_t count = file == -1 ? -1 : read(file, &value, 1);
    if (file != -1) {
        close(file);
    }
    if (count != 1) {
        return KERN_FAILURE;
    }
    *state = value == '1';
    // Widen the race window: without the real helper's lock, overlapping
    // processes read the same value and lose toggles.
    usleep(20000);
    return KERN_SUCCESS;
}

kern_return_t IOHIDSetModifierLockState(io_connect_t connection, int selector, bool state) {
    (void)connection;
    (void)selector;
    if (failure_is("write")) {
        return KERN_FAILURE;
    }
    if (failure_is("verify")) {
        return KERN_SUCCESS;
    }
    const char *path = getenv("CAPS_LOCK_TEST_STATE");
    if (!path) {
        return KERN_FAILURE;
    }
    int file = open(path, O_WRONLY);
    char value = state ? '1' : '0';
    ssize_t count = file == -1 ? -1 : write(file, &value, 1);
    if (file != -1) {
        close(file);
    }
    return count == 1 ? KERN_SUCCESS : KERN_FAILURE;
}
