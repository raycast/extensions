#include <stdio.h>
#include <stdbool.h>
#include <unistd.h>
#include <IOKit/graphics/IOGraphicsLib.h>
#include <ApplicationServices/ApplicationServices.h>

/* As of macOS 10.12.4, brightness set by public IOKit API is
   overridden by CoreDisplay's brightness (to support Night Shift). In
   addition, using CoreDisplay to get brightness supports additional
   display types, e.g. the 2015 iMac's internal display.

   The below functions in CoreDisplay seem to work to adjust the
   "user" brightness (like dragging the slider in System Preferences
   or using function keys).  The symbols below are listed in the .tbd
   file in CoreDisplay.framework so it is at least more "public" than
   a symbol in a private framework, though there are no public headers
   distributed for this framework. */
extern double CoreDisplay_Display_GetUserBrightness(CGDirectDisplayID id)
  __attribute__((weak_import));
extern void CoreDisplay_Display_SetUserBrightness(CGDirectDisplayID id,
                                                  double brightness)
  __attribute__((weak_import));

/* Some issues with the above CoreDisplay functions include:

   - There's no way to tell if setting the brightness was successful

   - There's no way to tell if a brightness of 1 means that the
     brightness is actually 1, or if there's no adjustable brightness

   - Brightness changes aren't reflected in System Preferences
     immediately

   - They don't work on Apple Silicon Macs

   Fixing these means using the private DisplayServices.framework.  Be
   even more careful about these.
*/
extern bool DisplayServicesCanChangeBrightness(CGDirectDisplayID id)
  __attribute__((weak_import));
extern void DisplayServicesBrightnessChanged(CGDirectDisplayID id,
                                             double brightness)
  __attribute__((weak_import));

/* Below functions are necessary on Apple Silicon/macOS 11. */
extern int DisplayServicesGetBrightness(CGDirectDisplayID id,
                                        float *brightness)
  __attribute__((weak_import));
extern int DisplayServicesSetBrightness(CGDirectDisplayID id,
                                        float brightness)
  __attribute__((weak_import));

const int kMaxDisplays = 16;
const CFStringRef kDisplayBrightness = CFSTR(kIODisplayBrightnessKey);
const char *APP_NAME;

static void errexit(const char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  fprintf(stderr, "%s: ", APP_NAME);
  vfprintf(stderr, fmt, ap);
  fprintf(stderr, "\n");
  exit(1);
}

__attribute__((noreturn))
static void usage() {
  fprintf(stderr, "usage: %s [-m|-d display] [-v] <brightness>\n", APP_NAME);
  fprintf(stderr, "   or: %s -l [-v]\n", APP_NAME);
  exit(1);
}

static bool CFNumberEqualsUInt32(CFNumberRef number, uint32_t uint32) {
  if (number == NULL)
    return (uint32 == 0);

  /* there's no CFNumber type guaranteed to be a uint32, so pick
     something bigger that's guaranteed not to truncate */
  int64_t int64;
  if (!CFNumberGetValue(number, kCFNumberSInt64Type, &int64))
    return false;

  return (int64 == uint32);
}

/* CGDisplayIOServicePort is deprecated as of 10.9; try to match ourselves */
static io_service_t CGDisplayGetIOServicePort(CGDirectDisplayID dspy) {
  uint32_t vendor = CGDisplayVendorNumber(dspy);
  uint32_t model = CGDisplayModelNumber(dspy); // == product ID
  uint32_t serial = CGDisplaySerialNumber(dspy);

  CFMutableDictionaryRef matching = IOServiceMatching("IODisplayConnect");

  io_iterator_t iter;
  if (IOServiceGetMatchingServices(kIOMasterPortDefault, matching, &iter))
    return 0;

  io_service_t service, matching_service = 0;
  while ( (service = IOIteratorNext(iter)) != 0) {
    CFDictionaryRef info = IODisplayCreateInfoDictionary(service, kIODisplayNoProductName);

    CFNumberRef vendorID = CFDictionaryGetValue(info, CFSTR(kDisplayVendorID));
    CFNumberRef productID = CFDictionaryGetValue(info, CFSTR(kDisplayProductID));
    CFNumberRef serialNumber = CFDictionaryGetValue(info, CFSTR(kDisplaySerialNumber));

    if (CFNumberEqualsUInt32(vendorID, vendor) &&
        CFNumberEqualsUInt32(productID, model) &&
        CFNumberEqualsUInt32(serialNumber, serial)) {
      matching_service = service;

      CFRelease(info);
      break;
    }

    CFRelease(info);
  }

  IOObjectRelease(iter);
  return matching_service;
}

static bool setBrightness(CGDirectDisplayID dspy, io_service_t service,
                             float brightness) {
  /* 1. Try DisplayServices set SPI - more likely to work on
     recent macOS */
  if ((DisplayServicesSetBrightness != NULL) &&
      !DisplayServicesSetBrightness(dspy, brightness)) {
    return true;
  }

  /* 2. Try CoreDisplay SPI wrapped by DisplayServices (if available)
     to work around caveats as described above */
  if (CoreDisplay_Display_SetUserBrightness != NULL) {
    if ((DisplayServicesCanChangeBrightness != NULL) &&
        !DisplayServicesCanChangeBrightness(dspy)) {
      fprintf(stderr,
              "%s: unable to set brightness of display 0x%x\n",
              APP_NAME, (unsigned int)dspy);
      return false;
    }

    CoreDisplay_Display_SetUserBrightness(dspy, brightness);

    if (DisplayServicesBrightnessChanged != NULL)
      DisplayServicesBrightnessChanged(dspy, brightness);
    return true;
  }

  /* 3. Try IODisplay API */
  IOReturn err = IODisplaySetFloatParameter(service, kNilOptions,
                                            kDisplayBrightness, brightness);
  if (err != kIOReturnSuccess) {
    fprintf(stderr,
            "%s: failed to set brightness of display 0x%x (error %d)\n",
            APP_NAME, (unsigned int)dspy, err);
    return false;
  }
  
  return true;
}

static bool getBrightness(CGDirectDisplayID dspy, io_service_t service,
                          float *brightness) {
  /* 1. Try DisplayServices get SPI - more likely to work on recent
     macOS */
  if ((DisplayServicesGetBrightness != NULL) &&
      !DisplayServicesGetBrightness(dspy, brightness)) {
    return true;
  }

  /* 2. Try CoreDisplay SPI wrapped by DisplayServices (if available)
     to work around caveats as described above */
  if (CoreDisplay_Display_GetUserBrightness != NULL) {
    if ((DisplayServicesCanChangeBrightness != NULL) &&
        !DisplayServicesCanChangeBrightness(dspy)) {
      fprintf(stderr,
              "%s: unable to get brightness of display 0x%x\n",
              APP_NAME, (unsigned int)dspy);
      return false;
    }
    
    *brightness = CoreDisplay_Display_GetUserBrightness(dspy);
    return true;
  }

  /* 3. Try IODisplay API */
  IOReturn err = IODisplayGetFloatParameter(service, kNilOptions,
                                            kDisplayBrightness, brightness);
  if (err != kIOReturnSuccess) {
    fprintf(stderr,
            "%s: failed to get brightness of display 0x%x (error %d)\n",
            APP_NAME, (unsigned int)dspy, err);
    return false;
  }
  return true;
}

int main(int argc, char * const argv[]) {
  APP_NAME = argv[0];
  if (argc == 1)
    usage();

  int verbose = 0;
  CGDirectDisplayID displayToSet = 0;
  enum { ACTION_LIST, ACTION_SET_ALL, ACTION_SET_ONE } action = ACTION_SET_ALL;
  extern char *optarg;
  extern int optind;
  int ch;

  while ( (ch = getopt(argc, argv, "lmvd:")) != -1) {
    switch (ch) {
    case 'l':
      if (action == ACTION_SET_ONE) usage();
      action = ACTION_LIST;
      break;
    case 'v':
      verbose = 1;
      break;
    case 'm':
      if (action != ACTION_SET_ALL) usage();
      action = ACTION_SET_ONE;
      displayToSet = CGMainDisplayID();
      break;
    case 'd':
      if (action != ACTION_SET_ALL) usage();
      action = ACTION_SET_ONE;
      errno = 0;
      displayToSet = strtoul(optarg, NULL, 0);
      if (errno == EINVAL || errno == ERANGE)
	errexit("display must be an integer index (0) or a hexadecimal ID (0x4270a80)");
      break;
    default: usage();
    }
  }

  argc -= optind;
  argv += optind;

  float brightness;
  if (action == ACTION_LIST) {
    if (argc > 0) usage();
  } else {
    if (argc != 1) usage();

    errno = 0;
    brightness = strtof(argv[0], NULL);
    if (errno == ERANGE)
      usage();
    if (brightness < 0 || brightness > 1)
      errexit("brightness must be between 0 and 1");
  }

  CGDirectDisplayID display[kMaxDisplays];
  CGDisplayCount numDisplays;
  CGDisplayErr err;
  err = CGGetOnlineDisplayList(kMaxDisplays, display, &numDisplays);
  if (err != CGDisplayNoErr)
    errexit("cannot get list of displays (error %d)\n", err);

  CFWriteStreamRef stdoutStream = NULL;
  if (verbose) {
    CFURLRef devStdout =
      CFURLCreateWithFileSystemPath(NULL, CFSTR("/dev/stdout"),
				    kCFURLPOSIXPathStyle, false);
    stdoutStream = CFWriteStreamCreateWithFile(NULL, devStdout);
    if (stdoutStream == NULL)
      errexit("cannot create CFWriteStream for /dev/stdout");
    if (!CFWriteStreamOpen(stdoutStream))
      errexit("cannot open CFWriteStream for /dev/stdout");
  }

  for (CGDisplayCount i = 0; i < numDisplays; ++i) {
    CGDirectDisplayID dspy = display[i];
    CGDisplayModeRef mode = CGDisplayCopyDisplayMode(dspy);
    if (mode == NULL)
      continue;

    if (action == ACTION_LIST) {
      printf("display %d: ", i);
      if (CGDisplayIsMain(dspy))
	printf("main, ");
      printf("%sactive, %s, %sline, %s%s",
             CGDisplayIsActive(dspy) ? "" : "in",
             CGDisplayIsAsleep(dspy) ? "asleep" : "awake",
             CGDisplayIsOnline(dspy) ? "on" : "off",
             CGDisplayIsBuiltin(dspy) ? "built-in" : "external",
             CGDisplayIsStereo(dspy) ? ", stereo" : "");
      printf(", ID 0x%x\n", (unsigned int)dspy);
      if (verbose) {
        CGRect bounds = CGDisplayBounds(dspy);
        printf("\tresolution %.0f x %.0f pt",
               bounds.size.width, bounds.size.height);
        printf(" (%zu x %zu px)",
               CGDisplayModeGetPixelWidth(mode),
               CGDisplayModeGetPixelHeight(mode));
        double refreshRate = CGDisplayModeGetRefreshRate(mode);
        if (refreshRate != 0)
          printf(" @ %.1f Hz", refreshRate);
        printf(", origin (%.0f, %.0f)\n",
               bounds.origin.x, bounds.origin.y);
        CGSize size = CGDisplayScreenSize(dspy);
        printf("\tphysical size %.0f x %.0f mm",
               size.width, size.height);
        double rotation = CGDisplayRotation(dspy);
        if (rotation)
          printf(", rotated %.0f°", rotation);
        printf("\n\tIOKit flags 0x%x",
               CGDisplayModeGetIOFlags(mode));
        printf("; IOKit display mode ID 0x%x\n",
               CGDisplayModeGetIODisplayModeID(mode));
        if (CGDisplayIsInMirrorSet(dspy)) {
          CGDirectDisplayID mirrorsDisplay = CGDisplayMirrorsDisplay(dspy);
          if (mirrorsDisplay == kCGNullDirectDisplay)
            printf("\tmirrored\n");
          else
            printf("\tmirrors display ID 0x%x\n", mirrorsDisplay);
        }
        printf("\t%susable for desktop GUI%s\n",
               CGDisplayModeIsUsableForDesktopGUI(mode) ? "" : "not ",
               CGDisplayUsesOpenGLAcceleration(dspy) ?
               ", uses OpenGL acceleration" : "");
      }
    }
    CGDisplayModeRelease(mode);

    io_service_t service = CGDisplayGetIOServicePort(dspy);
    switch (action) {
    case ACTION_SET_ONE:
      if (displayToSet != dspy && displayToSet != i)
	continue;
    case ACTION_SET_ALL:
      if (!setBrightness(dspy, service, brightness)) continue;
      if (!verbose) continue;
    case ACTION_LIST:
      if (!getBrightness(dspy, service, &brightness)) continue;
      printf("display %d: brightness %f\n", i, brightness);
    }
  }

  return 0;
}
