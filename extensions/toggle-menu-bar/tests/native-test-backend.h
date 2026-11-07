// Compiled only with MENU_BAR_TEST_BACKEND. Keep all preference storage,
// WindowServer calls and distributed notifications out of this test executable.
// fd 3 reports checkpoints; fd 4 releases a requested checkpoint barrier.
#include <errno.h>

static void testCheckpoint(const char *event) {
  if (dprintf(3, "%s\n", event) < 0) {
    exit(90);
  }
  const char *pause = getenv("TMB_TEST_PAUSE");
  if (pause != NULL && strcmp(pause, event) == 0) {
    char release;
    if (dprintf(3, "paused\n") < 0 || read(4, &release, 1) != 1) {
      exit(90);
    }
  }
}

static void testCheckContention(int fd, bool shared) {
  if (getenv("TMB_TEST_EXPECT_CONTENTION") == NULL) {
    return;
  }
  // Prove this process has reached a lock held incompatibly by another live
  // process. Then use the same blocking flock below as the production build.
  if (flock(fd, (shared ? LOCK_SH : LOCK_EX) | LOCK_NB) == 0 ||
      errno != EWOULDBLOCK) {
    fprintf(stderr, "Expected a contended kernel lock\n");
    exit(91);
  }
  testCheckpoint("contended");
}

static bool testReadState(int *option, int *controlCenterOption) {
  const char *path = getenv("TMB_TEST_STATE");
  FILE *state = path != NULL ? fopen(path, "r") : NULL;
  if (state == NULL) {
    return false;
  }
  const bool success = fscanf(state, "%d %d", option, controlCenterOption) == 2;
  fclose(state);
  return success;
}

static bool writeMode(int option, bool updateControlCenterOption,
                      const SkyLightFunctions *skyLight) {
  (void)skyLight;
  int previousOption, controlCenterOption;
  if (!testReadState(&previousOption, &controlCenterOption)) {
    return false;
  }
  FILE *state = fopen(getenv("TMB_TEST_STATE"), "w");
  if (state == NULL) {
    return false;
  }
  fprintf(state, "%d %d\n", option,
          updateControlCenterOption ? option : controlCenterOption);
  if (fclose(state) != 0) {
    return false;
  }
  static int writes = 0;
  char event[64];
  snprintf(event, sizeof(event), "write:%d:%d:%d", ++writes, option,
           updateControlCenterOption);
  testCheckpoint(event);
  return true;
}

static void postRefreshNotifications(void) {
  testCheckpoint("notify");
}

static int readCurrentOption(void) {
  int option, controlCenterOption;
  if (!testReadState(&option, &controlCenterOption)) {
    return -1;
  }
  char event[32];
  snprintf(event, sizeof(event), "read:%d", option);
  testCheckpoint(event);
  return option >= 0 && option <= 3 ? option : -1;
}

static int readControlCenterOption(void) {
  int option, controlCenterOption;
  return testReadState(&option, &controlCenterOption) &&
                 controlCenterOption >= 0 && controlCenterOption <= 3
             ? controlCenterOption
             : -1;
}
