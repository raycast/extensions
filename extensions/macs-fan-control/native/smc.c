// smc.c — read-only SMC reader for the Macs Fan Control Raycast extension.
//
// Emits a JSON snapshot of every fan and thermal sensor the SMC exposes.
// Read-only by design: this binary never writes an SMC key, so it needs no
// root and cannot change fan behaviour. All actual fan control in this
// extension is delegated to Macs Fan Control's own privileged helper.
//
// Build: make            (universal arm64 + x86_64)

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <IOKit/IOKitLib.h>

typedef struct { char major, minor, build, reserved[1]; uint16_t release; } vers_t;
typedef struct { uint16_t version, length; uint32_t cpuPLimit, gpuPLimit, memPLimit; } plimit_t;
typedef struct { uint32_t dataSize, dataType; char dataAttributes; } keyInfo_t;
typedef struct {
  uint32_t key; vers_t vers; plimit_t pLimitData; keyInfo_t keyInfo;
  char result, status, data8; uint32_t data32; char bytes[32];
} SMCKeyData_t;

#define SMC_CMD_READ_BYTES     5
#define SMC_CMD_READ_INDEX     8
#define SMC_CMD_READ_KEYINFO   9

static io_connect_t conn;

static uint32_t s2k(const char *s) {
  return ((uint32_t)(uint8_t)s[0] << 24) | ((uint32_t)(uint8_t)s[1] << 16) |
         ((uint32_t)(uint8_t)s[2] << 8)  | (uint32_t)(uint8_t)s[3];
}
static void k2s(uint32_t k, char *o) {
  o[0] = (k >> 24) & 0xff; o[1] = (k >> 16) & 0xff;
  o[2] = (k >> 8) & 0xff;  o[3] = k & 0xff; o[4] = 0;
}
static kern_return_t smc_call(SMCKeyData_t *in, SMCKeyData_t *out) {
  size_t n = sizeof(SMCKeyData_t);
  return IOConnectCallStructMethod(conn, 2, in, n, out, &n);
}

static int smc_read(const char *key, keyInfo_t *ki, char *out) {
  SMCKeyData_t i = {0}, o = {0};
  i.key = s2k(key); i.data8 = SMC_CMD_READ_KEYINFO;
  if (smc_call(&i, &o) != kIOReturnSuccess || o.result != 0) return 0;
  if (o.keyInfo.dataSize == 0 || o.keyInfo.dataSize > 32) return 0;
  *ki = o.keyInfo;

  SMCKeyData_t i2 = {0}, o2 = {0};
  i2.key = s2k(key); i2.keyInfo.dataSize = o.keyInfo.dataSize;
  i2.data8 = SMC_CMD_READ_BYTES;
  if (smc_call(&i2, &o2) != kIOReturnSuccess || o2.result != 0) return 0;
  memcpy(out, o2.bytes, o.keyInfo.dataSize);
  return 1;
}

// Returns 1 and sets *v when the key's type is one we can decode numerically.
static int decode(keyInfo_t ki, const char *b, double *v) {
  char t[5]; k2s(ki.dataType, t);
  const uint8_t *u = (const uint8_t *)b;

  if (!strcmp(t, "flt ") && ki.dataSize == 4) { float f; memcpy(&f, b, 4); *v = f; return 1; }
  if (!strcmp(t, "ui8 ")) { *v = u[0]; return 1; }
  if (!strcmp(t, "ui16")) { *v = ((uint32_t)u[0] << 8) | u[1]; return 1; }
  if (!strcmp(t, "ui32")) { *v = ((uint32_t)u[0] << 24) | ((uint32_t)u[1] << 16) | ((uint32_t)u[2] << 8) | u[3]; return 1; }
  if (!strcmp(t, "si8 ")) { *v = (int8_t)u[0]; return 1; }
  if (!strcmp(t, "fpe2")) { *v = (double)(((uint32_t)u[0] << 8) | u[1]) / 4.0; return 1; }
  if (!strcmp(t, "sp78")) { *v = (double)(int8_t)u[0] + (double)u[1] / 256.0; return 1; }
  // ioft: 64-bit fixed point, 1/65536 units (Apple Silicon GPU/thermal sensors)
  if (!strcmp(t, "ioft") && ki.dataSize == 8) {
    uint64_t r = 0;
    for (int n = 0; n < 8; n++) r |= (uint64_t)u[n] << (8 * n);
    *v = (double)r / 65536.0;
    return 1;
  }
  return 0;
}

static int read_num(const char *key, double *v) {
  keyInfo_t ki; char buf[32] = {0};
  if (!smc_read(key, &ki, buf)) return 0;
  return decode(ki, buf, v);
}

static void json_str(const char *s) {
  putchar('"');
  for (; *s; s++) {
    if (*s == '"' || *s == '\\') { putchar('\\'); putchar(*s); }
    else if ((unsigned char)*s < 0x20) printf("\\u%04x", *s);
    else putchar(*s);
  }
  putchar('"');
}

// Emit "key": "<string>" when the SMC exposes a text key (e.g. a fan's
// location on Intel Macs). Apple silicon has no such keys, hence the null.
static void emit_str(const char *label, const char *key, int *first) {
  if (!*first) printf(",");
  *first = 0;
  printf("\"%s\":", label);

  keyInfo_t ki; char buf[33] = {0};
  if (!smc_read(key, &ki, buf)) { printf("null"); return; }
  char t[5]; k2s(ki.dataType, t);
  if (strcmp(t, "ch8*") != 0) { printf("null"); return; }
  buf[ki.dataSize < 32 ? ki.dataSize : 32] = 0;
  // Trim trailing padding the SMC leaves in fixed-width text keys.
  for (int i = (int)strlen(buf) - 1; i >= 0 && (buf[i] == ' ' || buf[i] == '\t'); i--) buf[i] = 0;
  if (buf[0] == 0) { printf("null"); return; }
  json_str(buf);
}

// Emit "key": value, or "key": null when the SMC has no such key.
static void emit_num(const char *label, const char *key, int *first) {
  double v;
  if (!*first) printf(",");
  *first = 0;
  printf("\"%s\":", label);
  if (read_num(key, &v)) printf("%.2f", v); else printf("null");
}

int main(void) {
  io_service_t svc = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMC"));
  if (!svc) { printf("{\"error\":\"AppleSMC service not found\"}\n"); return 1; }
  if (IOServiceOpen(svc, mach_task_self(), 0, &conn) != kIOReturnSuccess) {
    IOObjectRelease(svc);
    printf("{\"error\":\"Could not open AppleSMC\"}\n");
    return 1;
  }
  IOObjectRelease(svc);

  double fnum = 0;
  int fanCount = read_num("FNum", &fnum) ? (int)fnum : 0;
  if (fanCount < 0 || fanCount > 16) fanCount = 0;

  printf("{\"fans\":[");
  for (int i = 0; i < fanCount; i++) {
    char kAc[5], kMn[5], kMx[5], kTg[5], kMd[5], kId[5];
    snprintf(kAc, 5, "F%dAc", i); snprintf(kMn, 5, "F%dMn", i);
    snprintf(kMx, 5, "F%dMx", i); snprintf(kTg, 5, "F%dTg", i);
    snprintf(kMd, 5, "F%dmd", i); snprintf(kId, 5, "F%dID", i);

    if (i) printf(",");
    printf("{\"index\":%d", i);
    int first = 0;
    emit_num("actual", kAc, &first);
    emit_num("min",    kMn, &first);
    emit_num("max",    kMx, &first);
    emit_num("target", kTg, &first);
    emit_num("mode",   kMd, &first);
    emit_str("id",     kId, &first);
    printf("}");
  }
  printf("],\"sensors\":[");

  // Enumerate every key and report the thermal ones (T*) we can decode.
  double total = 0;
  int nkeys = read_num("#KEY", &total) ? (int)total : 0;
  int firstSensor = 1;
  for (int idx = 0; idx < nkeys; idx++) {
    SMCKeyData_t i = {0}, o = {0};
    i.data8 = SMC_CMD_READ_INDEX; i.data32 = idx;
    if (smc_call(&i, &o) != kIOReturnSuccess || o.result != 0) continue;

    char ks[5]; k2s(o.key, ks);
    if (ks[0] != 'T') continue;

    keyInfo_t ki; char buf[32] = {0}; double v;
    if (!smc_read(ks, &ki, buf)) continue;
    if (!decode(ki, buf, &v)) continue;
    // Discard obviously unpopulated / out-of-range thermal channels.
    if (v <= 0.0 || v > 150.0) continue;

    if (!firstSensor) printf(",");
    firstSensor = 0;
    printf("{\"key\":"); json_str(ks); printf(",\"value\":%.2f}", v);
  }
  printf("]}\n");
  return 0;
}
