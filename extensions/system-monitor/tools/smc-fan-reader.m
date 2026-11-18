#import <Foundation/Foundation.h>
#import <IOKit/IOKitLib.h>
#include <string.h>

typedef struct {
  uint32_t key;
  uint8_t vers_major;
  uint8_t vers_minor;
  uint8_t vers_build;
  uint8_t vers_reserved;
  uint16_t vers_release;
  uint16_t pl_version;
  uint16_t pl_length;
  uint32_t pl_cpu;
  uint32_t pl_gpu;
  uint32_t pl_mem;
  uint32_t dataSize;
  uint32_t dataType;
  uint8_t dataAttributes;
  uint16_t padding;
  uint8_t result;
  uint8_t status;
  uint8_t data8;
  uint32_t data32;
  uint8_t bytes[32];
} SMCKeyData;

#define kSMCGetKeyInfo 9
#define kSMCReadKey 5
#define kKernelIndexSMC 2

#define kTypeFlt 0x666C7420
#define kTypeFpe2 0x66706532
#define kTypeUi8 0x75693820
#define kTypeUi16 0x75693136

static io_connect_t gConn = 0;

static uint32_t toKey(const char *key) {
  uint32_t result = 0;
  for (int index = 0; index < 4 && key[index] != '\0'; index++) {
    result = (result << 8) | (uint32_t)key[index];
  }
  for (int index = (int)strlen(key); index < 4; index++) {
    result = (result << 8) | (uint32_t)' ';
  }
  return result;
}

static kern_return_t callSMC(SMCKeyData *input, SMCKeyData *output) {
  size_t outputSize = sizeof(SMCKeyData);
  return IOConnectCallStructMethod(gConn, kKernelIndexSMC, input, sizeof(SMCKeyData), output, &outputSize);
}

// SMC "flt " payloads are IEEE-754 floats in host byte order.
static float decodeFlt(const uint8_t *bytes) {
  float value = 0;
  memcpy(&value, bytes, sizeof(float));
  return value;
}

static float decodeFpe2(const uint8_t *bytes) {
  return (float)(((int)bytes[0] << 8) | (int)bytes[1]) / 4.0f;
}

static float decodeValue(const SMCKeyData *output) {
  if (output->dataType == kTypeFlt) {
    return decodeFlt(output->bytes);
  }

  if (output->dataType == kTypeFpe2) {
    return decodeFpe2(output->bytes);
  }

  if (output->dataType == kTypeUi16) {
    return (float)((output->bytes[0] << 8) | output->bytes[1]);
  }

  if (output->dataType == kTypeUi8) {
    return (float)output->bytes[0];
  }

  return decodeFlt(output->bytes);
}

static kern_return_t SMCOpen(void) {
  io_service_t service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMCKeysEndpoint"));
  if (!service) {
    service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMC"));
  }
  if (!service) {
    return KERN_FAILURE;
  }

  kern_return_t result = IOServiceOpen(service, mach_task_self(), 0, &gConn);
  IOObjectRelease(service);
  return result;
}

static kern_return_t SMCReadKey(const char *key, SMCKeyData *output) {
  SMCKeyData input;
  memset(&input, 0, sizeof(input));
  memset(output, 0, sizeof(SMCKeyData));
  input.key = toKey(key);
  input.data8 = kSMCGetKeyInfo;

  if (callSMC(&input, output) != KERN_SUCCESS) {
    return KERN_FAILURE;
  }

  memset(&input, 0, sizeof(input));
  input.key = toKey(key);
  input.dataSize = output->dataSize;
  input.dataType = output->dataType;
  input.dataAttributes = output->dataAttributes;
  input.data8 = kSMCReadKey;

  return callSMC(&input, output);
}

static float readFloatKey(const char *key) {
  SMCKeyData output;
  if (SMCReadKey(key, &output) != KERN_SUCCESS) {
    return -1;
  }

  return decodeValue(&output);
}

static uint8_t readUi8Key(const char *key) {
  SMCKeyData output;
  if (SMCReadKey(key, &output) != KERN_SUCCESS) {
    return 0;
  }

  return output.bytes[0];
}

int main() {
  @autoreleasepool {
    NSMutableArray *fans = [NSMutableArray array];

    // Exit non-zero so the caller can tell an SMC failure apart from a fanless Mac.
    if (SMCOpen() != KERN_SUCCESS) {
      return 1;
    }

    uint8_t fanCount = readUi8Key("FNum");
    if (fanCount == 0 || fanCount > 4) {
      fanCount = 2;
    }

    for (uint8_t index = 0; index < fanCount; index++) {
      char actualKey[5] = {0};
      char minKey[5] = {0};
      char maxKey[5] = {0};
      snprintf(actualKey, sizeof(actualKey), "F%dAc", index);
      snprintf(minKey, sizeof(minKey), "F%dMn", index);
      snprintf(maxKey, sizeof(maxKey), "F%dMx", index);

      float actual = readFloatKey(actualKey);
      float minimum = readFloatKey(minKey);
      float maximum = readFloatKey(maxKey);

      if (actual < 0 && minimum < 0 && maximum < 0) {
        continue;
      }

      [fans addObject:@{
        @"index" : @(index),
        @"actualRpm" : @((NSInteger)(actual > 0 ? actual : 0)),
        @"minRpm" : @((NSInteger)(minimum > 0 ? minimum : 0)),
        @"maxRpm" : @((NSInteger)(maximum > 0 ? maximum : 0)),
      }];
    }

    IOServiceClose(gConn);

    NSDictionary *result = @{@"available" : @(fans.count > 0), @"fans" : fans};
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
    if (jsonData) {
      printf("%s\n", [[[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding] UTF8String]);
    }
  }

  return 0;
}
