#import <Foundation/Foundation.h>
#import <IOKit/hidsystem/IOHIDEventSystemClient.h>
#include <sys/sysctl.h>

typedef struct __IOHIDEvent *IOHIDEventRef;
typedef struct __IOHIDServiceClient *IOHIDServiceClientRef;

#define IOHIDEventFieldBase(type) (type << 16)
#define kIOHIDEventTypeTemperature 15

extern IOHIDEventSystemClientRef IOHIDEventSystemClientCreate(CFAllocatorRef allocator);
extern int IOHIDEventSystemClientSetMatching(IOHIDEventSystemClientRef client, CFDictionaryRef match);
extern IOHIDEventRef IOHIDServiceClientCopyEvent(IOHIDServiceClientRef, int64_t, int32_t, int64_t);
extern CFStringRef IOHIDServiceClientCopyProperty(IOHIDServiceClientRef service, CFStringRef property);
extern double IOHIDEventGetFloatValue(IOHIDEventRef event, int32_t field);
extern CFArrayRef IOHIDEventSystemClientCopyServices(IOHIDEventSystemClientRef client);

int main() {
    @autoreleasepool {
        IOHIDEventSystemClientRef client = IOHIDEventSystemClientCreate(kCFAllocatorDefault);
        NSDictionary* match = @{@"PrimaryUsagePage": @(0xff00), @"PrimaryUsage": @(5)};
        IOHIDEventSystemClientSetMatching(client, (__bridge CFDictionaryRef)match);

        NSArray* services = (__bridge_transfer NSArray*)IOHIDEventSystemClientCopyServices(client);
        if (!services) services = @[];

        // Read all sensors, deduplicating by name (keep latest reading)
        NSMutableDictionary* sensorMap = [NSMutableDictionary dictionary];
        for (id service in services) {
            NSString* name = (__bridge_transfer NSString*)IOHIDServiceClientCopyProperty(
                (__bridge IOHIDServiceClientRef)service, CFSTR("Product"));
            if (!name) continue;

            IOHIDEventRef event = IOHIDServiceClientCopyEvent(
                (__bridge IOHIDServiceClientRef)service,
                kIOHIDEventTypeTemperature, 0, 0);
            if (!event) continue;

            double temp = IOHIDEventGetFloatValue(event, IOHIDEventFieldBase(kIOHIDEventTypeTemperature));
            if (temp > 0 && temp < 130) {
                sensorMap[name] = @(round(temp * 10) / 10);
            }
        }

        NSMutableArray* sensors = [NSMutableArray array];
        NSMutableArray* cpuTemps = [NSMutableArray array];
        NSMutableArray* gpuTemps = [NSMutableArray array];

        for (NSString* name in sensorMap) {
            double temp = [sensorMap[name] doubleValue];
            [sensors addObject:@{@"name": name, @"temperature": @(temp)}];

            NSString* lower = [name lowercaseString];
            // PMU tdie* = CPU die temperature sensors
            if ([lower containsString:@"die"]) {
                [cpuTemps addObject:@(temp)];
            }
            if ([lower containsString:@"gpu"]) {
                [gpuTemps addObject:@(temp)];
            }
        }

        double cpuAvg = -1, cpuMax = -1, gpuAvg = -1;
        if (cpuTemps.count > 0) {
            double sum = 0, max = 0;
            for (NSNumber* t in cpuTemps) {
                sum += [t doubleValue];
                if ([t doubleValue] > max) max = [t doubleValue];
            }
            cpuAvg = round((sum / cpuTemps.count) * 10) / 10;
            cpuMax = round(max * 10) / 10;
        }
        if (gpuTemps.count > 0) {
            double sum = 0;
            for (NSNumber* t in gpuTemps) sum += [t doubleValue];
            gpuAvg = round((sum / gpuTemps.count) * 10) / 10;
        }

        // Detect chip model
        size_t size = 0;
        NSString* chipModel = @"Unknown";
        BOOL isAppleSilicon = NO;
        if (sysctlbyname("machdep.cpu.brand_string", NULL, &size, NULL, 0) == 0) {
            char* brand = malloc(size);
            if (sysctlbyname("machdep.cpu.brand_string", brand, &size, NULL, 0) == 0) {
                chipModel = [NSString stringWithUTF8String:brand];
                isAppleSilicon = strstr(brand, "Apple") != NULL;
            }
            free(brand);
        }

        // Get CPU core count
        int coreCount = 0;
        size = sizeof(coreCount);
        sysctlbyname("hw.ncpu", &coreCount, &size, NULL, 0);

        // Get machine model (e.g. "Mac14,5")
        size = 0;
        NSString* machineModel = @"Unknown";
        if (sysctlbyname("hw.model", NULL, &size, NULL, 0) == 0) {
            char* model = malloc(size);
            if (sysctlbyname("hw.model", model, &size, NULL, 0) == 0) {
                machineModel = [NSString stringWithUTF8String:model];
            }
            free(model);
        }

        NSDictionary* result = @{
            @"sensors": sensors,
            @"cpuAverage": @(cpuAvg),
            @"cpuMax": @(cpuMax),
            @"gpuAverage": @(gpuAvg),
            @"isAppleSilicon": @(isAppleSilicon),
            @"sensorAvailable": @(sensors.count > 0),
            @"chipModel": chipModel,
            @"coreCount": @(coreCount),
            @"machineModel": machineModel,
            @"dieSensorCount": @(cpuTemps.count)
        };

        NSData* jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
        if (jsonData) {
            printf("%s\n", [[[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding] UTF8String]);
        }
    }
    return 0;
}
