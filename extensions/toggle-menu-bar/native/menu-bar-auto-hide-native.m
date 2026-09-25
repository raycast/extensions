#import <CoreFoundation/CoreFoundation.h>
#import <Foundation/Foundation.h>

#include <dlfcn.h>
#include <fcntl.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/file.h>
#include <unistd.h>

typedef uint32_t CGSConnectionID;
typedef CGSConnectionID (*CGSMainConnectionIDFunction)(void);
typedef int32_t (*CGSSetMenuBarAutohideEnabledFunction)(CGSConnectionID, bool);

typedef struct {
  void *handle;
  CGSMainConnectionIDFunction mainConnectionID;
  CGSSetMenuBarAutohideEnabledFunction setMenuBarAutohideEnabled;
} SkyLightFunctions;

static bool loadSkyLightFunctions(SkyLightFunctions *functions) {
  const char *path =
      "/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight";
  functions->handle = dlopen(path, RTLD_NOW | RTLD_LOCAL);
  if (functions->handle == NULL) {
    fprintf(stderr, "Could not load SkyLight: %s\n", dlerror());
    return false;
  }

  functions->mainConnectionID = (CGSMainConnectionIDFunction)dlsym(
      functions->handle, "CGSMainConnectionID");
  functions->setMenuBarAutohideEnabled =
      (CGSSetMenuBarAutohideEnabledFunction)dlsym(
          functions->handle, "CGSSetMenuBarAutohideEnabled");

  if (functions->mainConnectionID == NULL ||
      functions->setMenuBarAutohideEnabled == NULL) {
    fprintf(stderr, "Could not resolve the SkyLight menu bar functions\n");
    dlclose(functions->handle);
    functions->handle = NULL;
    return false;
  }

  return true;
}

static useconds_t pulseStepDelay(void) {
  const useconds_t defaultDelay = 60000;
  const char *rawMilliseconds = getenv("MENU_BAR_PULSE_STEP_MS");
  if (rawMilliseconds == NULL || *rawMilliseconds == '\0') {
    return defaultDelay;
  }

  char *end = NULL;
  long milliseconds = strtol(rawMilliseconds, &end, 10);
  if (end == rawMilliseconds || *end != '\0' || milliseconds < 20 ||
      milliseconds > 1000) {
    fprintf(stderr,
            "Ignoring invalid MENU_BAR_PULSE_STEP_MS=%s (expected 20-1000)\n",
            rawMilliseconds);
    return defaultDelay;
  }

  return (useconds_t)milliseconds * 1000;
}

static bool writeMode(int option, bool updateControlCenterOption,
                      const SkyLightFunctions *skyLight) {
  const bool hideOnDesktop = option <= 1;
  const bool visibleInFullScreen = option % 2 == 1;
  const CFBooleanRef desktopValue =
      hideOnDesktop ? kCFBooleanTrue : kCFBooleanFalse;
  const CFBooleanRef fullScreenValue =
      visibleInFullScreen ? kCFBooleanTrue : kCFBooleanFalse;

  CFPreferencesSetValue(CFSTR("_HIHideMenuBar"), desktopValue,
                        kCFPreferencesAnyApplication,
                        kCFPreferencesCurrentUser, kCFPreferencesAnyHost);
  CFPreferencesSetValue(CFSTR("AppleMenuBarVisibleInFullscreen"),
                        fullScreenValue, kCFPreferencesAnyApplication,
                        kCFPreferencesCurrentUser, kCFPreferencesAnyHost);

  if (!CFPreferencesSynchronize(kCFPreferencesAnyApplication,
                                kCFPreferencesCurrentUser,
                                kCFPreferencesAnyHost)) {
    fprintf(stderr, "Could not synchronize the global menu bar preferences\n");
    return false;
  }

  // AutoHideMenuBarOption is only the popup's display value. Do not pulse it:
  // asynchronous readers could otherwise mistake an intermediate mode for the
  // final result. Keep it synchronized only when applying the requested mode.
  if (updateControlCenterOption) {
    int32_t rawOption = option;
    CFNumberRef optionValue = CFNumberCreate(
        kCFAllocatorDefault, kCFNumberSInt32Type, &rawOption);
    CFPreferencesSetAppValue(CFSTR("AutoHideMenuBarOption"), optionValue,
                             CFSTR("com.apple.controlcenter"));
    CFRelease(optionValue);

    if (!CFPreferencesAppSynchronize(CFSTR("com.apple.controlcenter"))) {
      fprintf(stderr, "Could not synchronize the Control Center preference\n");
      return false;
    }
  }

  int32_t result = skyLight->setMenuBarAutohideEnabled(
      skyLight->mainConnectionID(), hideOnDesktop);
  if (result != 0) {
    fprintf(stderr, "WindowServer rejected the menu bar mode (%d)\n", result);
    return false;
  }

  return true;
}

static void postRefreshNotifications(void) {
  NSDistributedNotificationCenter *center =
      [NSDistributedNotificationCenter defaultCenter];
  [center
      postNotificationName:
          @"AppleInterfaceFullScreenMenuBarVisibilityChangedNotification"
                      object:nil
                    userInfo:nil
          deliverImmediately:YES];
  [center postNotificationName:@"AppleInterfaceMenuBarHidingChangedNotification"
                        object:nil
                      userInfo:nil
            deliverImmediately:YES];
}

static bool readBooleanPreference(CFStringRef key, bool *value) {
  CFPropertyListRef storedValue = CFPreferencesCopyValue(
      key, kCFPreferencesAnyApplication, kCFPreferencesCurrentUser,
      kCFPreferencesAnyHost);
  if (storedValue == NULL ||
      CFGetTypeID(storedValue) != CFBooleanGetTypeID()) {
    if (storedValue != NULL) {
      CFRelease(storedValue);
    }
    return false;
  }

  *value = CFBooleanGetValue((CFBooleanRef)storedValue);
  CFRelease(storedValue);
  return true;
}

static int readCurrentOption(void) {
  if (!CFPreferencesSynchronize(kCFPreferencesAnyApplication,
                                kCFPreferencesCurrentUser,
                                kCFPreferencesAnyHost)) {
    return -1;
  }

  bool hideOnDesktop = false;
  bool visibleInFullScreen = false;
  if (!readBooleanPreference(CFSTR("_HIHideMenuBar"), &hideOnDesktop) ||
      !readBooleanPreference(CFSTR("AppleMenuBarVisibleInFullscreen"),
                             &visibleInFullScreen)) {
    return -1;
  }

  if (hideOnDesktop) {
    return visibleInFullScreen ? 1 : 0;
  }
  return visibleInFullScreen ? 3 : 2;
}

static int readControlCenterOption(void) {
  CFPropertyListRef storedValue = CFPreferencesCopyAppValue(
      CFSTR("AutoHideMenuBarOption"), CFSTR("com.apple.controlcenter"));
  if (storedValue == NULL ||
      CFGetTypeID(storedValue) != CFNumberGetTypeID()) {
    if (storedValue != NULL) {
      CFRelease(storedValue);
    }
    return -1;
  }

  int32_t option = -1;
  const bool valid = CFNumberGetValue((CFNumberRef)storedValue,
                                      kCFNumberSInt32Type, &option) &&
                     option >= 0 && option <= 3;
  CFRelease(storedValue);
  return valid ? (int)option : -1;
}

static int readCurrentOptionWithFallback(void) {
  const int option = readCurrentOption();
  if (option >= 0) {
    return option;
  }
  // The global preferences are authoritative. The Control Center value only
  // mirrors the popup selection and can lag behind, but it is better than
  // failing when the globals are temporarily unreadable.
  return readControlCenterOption();
}

static bool parseOption(const char *text, int *option) {
  char *end = NULL;
  const long value = strtol(text, &end, 10);
  if (end == text || *end != '\0' || value < 0 || value > 3) {
    return false;
  }
  *option = (int)value;
  return true;
}

static void mutationLockPath(char *buffer, size_t capacity) {
  const char *override = getenv("MENU_BAR_MUTATION_LOCK_FILE");
  if (override != NULL && *override != '\0') {
    snprintf(buffer, capacity, "%s", override);
    return;
  }
  const char *tmpdir = getenv("TMPDIR");
  if (tmpdir == NULL || *tmpdir == '\0') {
    tmpdir = "/tmp";
  }
  snprintf(buffer, capacity, "%s/toggle-menu-bar-mutation.lock", tmpdir);
}

static int acquireModeLock(bool shared) {
  char path[PATH_MAX];
  mutationLockPath(path, sizeof(path));

  const int fd = open(path, O_CREAT | O_RDWR, 0600);
  if (fd < 0) {
    fprintf(stderr, "Could not open the menu bar mutation lock (%s)\n", path);
    return -1;
  }
  // Shared reads wait for an exclusive pulse to finish. Mutations retain the
  // exclusive lock across their read, target choice, and pulse. The kernel
  // releases either lock automatically if the process dies.
  if (flock(fd, shared ? LOCK_SH : LOCK_EX) != 0) {
    fprintf(stderr, "Could not acquire the menu bar mode lock\n");
    close(fd);
    return -1;
  }
  return fd;
}

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    int firstOption = -1;
    int secondOption = -1;
    int targetOption = -1;
    bool resolveToggle = false;
    bool readStatus = false;

    if (argc == 2 && strcmp(argv[1], "status") == 0) {
      readStatus = true;
    } else if (argc == 3 && strcmp(argv[1], "set") == 0) {
      if (!parseOption(argv[2], &targetOption)) {
        fprintf(stderr, "Invalid menu bar option: %s\n", argv[2]);
        return 2;
      }
    } else if (argc == 4 && strcmp(argv[1], "toggle") == 0) {
      if (!parseOption(argv[2], &firstOption) ||
          !parseOption(argv[3], &secondOption)) {
        fprintf(stderr, "Invalid toggle options: %s %s\n", argv[2], argv[3]);
        return 2;
      }
      resolveToggle = true;
    } else {
      fprintf(stderr,
              "Usage: %s status | set OPTION | toggle FIRST SECOND\n"
              "Options: 0 (Always), 1 (On Desktop Only), 2 (In Full Screen "
              "Only), 3 (Never)\n",
              argv[0]);
      return 2;
    }

    const int lockFd = acquireModeLock(readStatus);
    if (lockFd < 0) {
      return 1;
    }

    if (readStatus) {
      const int currentOption = readCurrentOptionWithFallback();
      if (currentOption < 0) {
        fprintf(stderr, "Could not determine the current menu bar mode\n");
        close(lockFd);
        return 1;
      }
      printf("option=%d\n", currentOption);
      close(lockFd);
      return 0;
    }

    SkyLightFunctions skyLight = {0};
    if (!loadSkyLightFunctions(&skyLight)) {
      close(lockFd);
      return 1;
    }

    if (resolveToggle) {
      const int currentOption = readCurrentOptionWithFallback();
      if (currentOption < 0) {
        fprintf(stderr, "Could not determine the current menu bar mode\n");
        dlclose(skyLight.handle);
        close(lockFd);
        return 1;
      }
      targetOption =
          (currentOption == firstOption) ? secondOption : firstOption;
    }

    // Traverse the four states in Gray-code order, starting and ending on the
    // target. Every notified transition flips exactly one real preference, so
    // observers cannot coalesce the pulse into repeated same-value refreshes.
    const int grayOrder[] = {2, 0, 1, 3};
    const size_t grayCount = sizeof(grayOrder) / sizeof(grayOrder[0]);
    size_t targetIndex = 0;
    while (grayOrder[targetIndex] != targetOption) {
      targetIndex++;
    }

    const useconds_t stepDelay = pulseStepDelay();
    bool pulseSucceeded = true;
    for (size_t step = 0; step <= grayCount; step++) {
      const int option = grayOrder[(targetIndex + step) % grayCount];
      const bool isTarget = step == 0 || step == grayCount;
      if (!writeMode(option, isTarget, &skyLight)) {
        pulseSucceeded = false;
        break;
      }

      // The first write is an unnotified baseline. The following four writes
      // are guaranteed real transitions and include every possible mode.
      if (step > 0) {
        postRefreshNotifications();
      }
      if (step > 0 && step < grayCount) {
        usleep(stepDelay);
      }
    }

    if (!pulseSucceeded) {
      // Best-effort restoration: never intentionally leave an intermediate
      // pulse state behind when a later operation fails.
      (void)writeMode(targetOption, true, &skyLight);
      postRefreshNotifications();
      dlclose(skyLight.handle);
      close(lockFd);
      return 1;
    }

    // Repeat only the notification while the requested values remain stable.
    usleep(120000);
    postRefreshNotifications();
    usleep(200000);
    postRefreshNotifications();

    // Make the requested values the last synchronized write as well as the
    // final notification. This prevents delayed observers from exposing one of
    // the deliberately transient pulse modes.
    if (!writeMode(targetOption, true, &skyLight)) {
      dlclose(skyLight.handle);
      close(lockFd);
      return 1;
    }
    usleep(100000);
    postRefreshNotifications();

    const int appliedOption = readCurrentOption();
    if (appliedOption != targetOption) {
      fprintf(stderr, "macOS did not retain the requested menu bar mode\n");
      dlclose(skyLight.handle);
      close(lockFd);
      return 1;
    }

    printf("option=%d\n", appliedOption);

    dlclose(skyLight.handle);
    close(lockFd);
  }

  return 0;
}
