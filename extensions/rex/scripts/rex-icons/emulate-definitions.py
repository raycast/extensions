import json, re, struct, sys
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UC_HOOK_CODE, UC_HOOK_MEM_UNMAPPED, UcError
from unicorn.arm64_const import *

S = sys.argv[1]
data = open(f"{S}/rex-arm64", "rb").read()
SEGMENTS = [(0x100000000, 0xc28000, 0, 12746752), (0x100c28000, 0x4c000, 12746752, 311296), (0x100c74000, 0xb4000, 13058048, 475136)]
START, END = 0x100a77c30, 0x100a7b1d8
RESULT_GLOBAL = 0x100d24c48

stubs = {}
for line in open(f"{S}/stubs.txt"):
    m = re.match(r"0x([0-9a-f]+) ; symbol stub for: (\S+)", line.strip())
    if m: stubs[int(m.group(1), 16)] = m.group(2)

mu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
mu.mem_map(0x100000000, 0xd28000)
for va, vs, fo, fs in SEGMENTS:
    mu.mem_write(va, data[fo:fo + fs])

# ---- dyld chained fixups: resolve rebases, redirect binds to per-symbol trampolines ----
IMPORT_BASE = 0x600000000
mu.mem_map(IMPORT_BASE, 0x400000)
import_names = {}
def process_chained_fixups():
    ncmds = struct.unpack_from("<I", data, 16)[0]
    off = 32
    fix = None
    for _ in range(ncmds):
        cmd, size = struct.unpack_from("<II", data, off)
        if cmd == 0x80000034:
            fix = struct.unpack_from("<II", data, off + 8)
        off += size
    if not fix:
        print("no chained fixups"); return
    dataoff, datasize = fix
    hdr = data[dataoff:dataoff + datasize]
    ver, starts_off, imports_off, symbols_off, imports_count, imports_format, symbols_format = struct.unpack_from("<7I", hdr, 0)
    names = []
    for i in range(imports_count):
        if imports_format == 1:
            v = struct.unpack_from("<I", hdr, imports_off + i * 4)[0]
            name_off = v >> 9
        elif imports_format == 2:
            v = struct.unpack_from("<Q", hdr, imports_off + i * 8)[0]
            name_off = v >> 32
        else:
            raise SystemExit(f"unsupported imports format {imports_format}")
        end = hdr.index(b"\x00", symbols_off + name_off)
        names.append(hdr[symbols_off + name_off:end].decode())
    for i, n in enumerate(names):
        import_names[IMPORT_BASE + i * 16] = n
    seg_count = struct.unpack_from("<I", hdr, starts_off)[0]
    seg_offsets = struct.unpack_from(f"<{seg_count}I", hdr, starts_off + 4)
    rebases = binds = 0
    for so in seg_offsets:
        if so == 0: continue
        base = starts_off + so
        size, page_size, pointer_format = struct.unpack_from("<IHH", hdr, base)
        segment_offset, max_valid, page_count = struct.unpack_from("<QIH", hdr, base + 8)
        page_starts = struct.unpack_from(f"<{page_count}H", hdr, base + 22)
        for pi, ps in enumerate(page_starts):
            if ps == 0xFFFF: continue
            loc = segment_offset + pi * page_size + ps
            while True:
                v = struct.unpack_from("<Q", data, loc)[0]
                nxt = (v >> 51) & 0xFFF
                if v >> 63:
                    ordinal = v & 0xFFFFFF
                    addend = (v >> 24) & 0xFF
                    target = IMPORT_BASE + ordinal * 16 + addend
                    binds += 1
                else:
                    if pointer_format == 6:
                        target = 0x100000000 + (v & 0xFFFFFFFFF)
                    else:
                        target = (v & 0xFFFFFFFFF) | (((v >> 36) & 0xFF) << 56)
                    rebases += 1
                vm = 0x100000000 + loc  # file offset == vm offset for this slice's segments
                mu.mem_write(vm, struct.pack("<Q", target))
                if nxt == 0: break
                loc += nxt * 4
    print(f"chained fixups: {rebases} rebases, {binds} binds, {len(names)} imports, format {pointer_format}")
process_chained_fixups()

STACK, STACK_SIZE = 0x200000000, 0x200000
HEAP, HEAP_SIZE = 0x300000000, 0x4000000
SENTINEL = 0x400000000
DUMMY = 0x500000000
for base, size in ((STACK, STACK_SIZE), (HEAP, HEAP_SIZE), (SENTINEL, 0x1000), (DUMMY, 0x10000)):
    mu.mem_map(base, size)
heap_top = [HEAP + 0x1000]
calls = {}
allocs = []

def alloc(size, align=16):
    size = (size + 15) & ~15
    p = heap_top[0]
    heap_top[0] += size + 16
    allocs.append((p, size))
    return p

def ret(mu, value=None):
    if value is not None: mu.reg_write(UC_ARM64_REG_X0, value)
    mu.reg_write(UC_ARM64_REG_PC, mu.reg_read(UC_ARM64_REG_X30))

def hook_code(mu, address, size, user):
    if address == SENTINEL:
        mu.emu_stop(); return
    name = stubs.get(address) or import_names.get(address)
    if not name: return
    calls[name] = calls.get(name, 0) + 1
    x0, x1, x2 = (mu.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2))
    if name == "_swift_allocObject":
        p = alloc(x1)
        mu.mem_write(p, struct.pack("<QQ", x0, 3))
        ret(mu, p)
    elif name in ("_swift_retain", "_swift_release", "_swift_bridgeObjectRetain", "_swift_bridgeObjectRelease",
                  "_swift_unknownObjectRetain", "_swift_unknownObjectRelease", "_swift_retain_n", "_swift_release_n",
                  "_objc_retain", "_objc_release"):
        ret(mu, x0)
    elif name in ("_memcpy", "_memmove"):
        mu.mem_write(x0, bytes(mu.mem_read(x1, x2))); ret(mu, x0)
    elif name in ("_memset",):
        mu.mem_write(x0, bytes([x1 & 0xFF]) * x2); ret(mu, x0)
    elif name in ("_bzero",):
        mu.mem_write(x0, b"\x00" * x1); ret(mu, x0)
    elif name == "_malloc_size":
        ret(mu, next((sz for p, sz in allocs if p == x0), 0))
    elif name == "_swift_isUniquelyReferenced_nonNull_native":
        ret(mu, 1)
    elif name == "_$ss22_minimumMergeRunLengthyS2iF":
        ret(mu, 32)
    elif name == "_$ss15ContiguousArrayV28_allocateBufferUninitialized15minimumCapacitys01_abD0VyxGSi_tFZ":
        p = alloc(0x6000)
        mu.mem_write(p, struct.pack("<QQQQ", DUMMY, 3, 0, x0))
        ret(mu, p)
    elif name == "_swift_once":
        # tail-call the initializer with its context, returning to our caller
        mu.reg_write(UC_ARM64_REG_X0, x2)
        mu.reg_write(UC_ARM64_REG_PC, x1)
    elif name.startswith("_swift_getTypeByMangledName") or name.startswith("_swift_getGenericMetadata") or \
         name.startswith("_swift_getWitnessTable") or name.startswith("_swift_allocateGenericValueMetadata") or \
         name in ("_swift_getObjCClassMetadata", "_swift_getForeignTypeMetadata", "_swift_checkMetadataState"):
        ret(mu, DUMMY + 0x100)
    else:
        calls["UNHANDLED " + name] = calls.get("UNHANDLED " + name, 0) + 1
        ret(mu, 0)

mu.hook_add(UC_HOOK_CODE, hook_code)
mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SIZE - 0x10000)
mu.reg_write(UC_ARM64_REG_X30, SENTINEL)
try:
    mu.emu_start(START, END)
except UcError as e:
    print("emulation error:", e, "pc=0x%x" % mu.reg_read(UC_ARM64_REG_PC))
print("runtime calls:", calls)
obj = next((p for p, sz in allocs if sz == 0x5110), None)
print("definitions buffer = %s (allocs: %s)" % (hex(obj) if obj else None, [(hex(p), hex(sz)) for p, sz in allocs][:12]))

def read(addr, n): return bytes(mu.mem_read(addr, n))
def u64(addr): return struct.unpack("<Q", read(addr, 8))[0]
def f64(addr): return struct.unpack("<d", read(addr, 8))[0]
def swift_string(addr):
    w1, w2 = struct.unpack("<QQ", read(addr, 16))
    disc = w2 >> 56
    if 0xE0 <= disc <= 0xEF:
        n = disc & 0xF
        raw = w1.to_bytes(8, "little") + (w2 & ((1 << 56) - 1)).to_bytes(7, "little")
        return raw[:n].decode("utf-8", "replace")
    if w2 & (1 << 63) or w2:
        count = w1 & 0xFFFFFFFFFFFF
        ptr = w2 & 0x00FFFFFFFFFFFFFF
        for extra in (32,):
            try:
                s = read(ptr + extra, count)
            except Exception:
                continue
            if all(32 <= c < 127 for c in s): return s.decode()
    return f"<str {w1:#x} {w2:#x}>"
def swift_array(addr, elem_size, parse):
    if addr == 0: return []
    try:
        count = u64(addr + 16)
    except Exception:
        return [f"<bad array {addr:#x}>"]
    if count > 64: return [f"<count {count}>"]
    return [parse(addr + 32 + i * elem_size) for i in range(count)]
def stop(a):
    return {"hex": "%06X" % (u64(a) & 0xFFFFFF), "p3": bool(read(a + 8, 1)[0]), "at": round(f64(a + 16), 4)}
STYLES = {0: "linear", 1: "radial", 2: "mesh"}
def gradient(a):
    stops = u64(a)
    if stops == 0: return None
    g = {
        "stops": swift_array(stops, 24, stop),
        "angle": round(f64(a + 8), 3),
        "style": STYLES.get(read(a + 0x10, 1)[0], read(a + 0x10, 1)[0]),
        "centerX": round(f64(a + 0x18), 4), "centerY": round(f64(a + 0x20), 4), "scale": round(f64(a + 0x28), 4),
        "meshIsWhite": bool(read(a + 0x38, 1)[0]),
    }
    mp = u64(a + 0x30)
    if mp: g["meshPoints"] = swift_array(mp, 16, lambda p: [round(f64(p), 4), round(f64(p + 8), 4)])
    if read(a + 0x48, 1)[0] == 0: g["meshBackgroundHex"] = "%06X" % (u64(a + 0x40) & 0xFFFFFF)
    g["meshBackgroundP3"] = bool(read(a + 0x49, 1)[0])
    if read(a + 0x58, 1)[0] == 0: g["primaryStopIndex"] = u64(a + 0x50)
    return g
count = u64(obj + 16)
if not 1 <= count <= 74: count = 74
print("array count:", count)
defs = []
for i in range(count):
    a = obj + 32 + i * 0x118
    d = {
        "glyph": swift_string(a),
        "title": swift_string(a + 0x28),
        "background": "%06X" % (u64(a + 0x10) & 0xFFFFFF),
        "foreground": "%06X" % (u64(a + 0x18) & 0xFFFFFF),
        "backgroundP3": bool(read(a + 0x20, 1)[0]),
        "foregroundP3": bool(read(a + 0x21, 1)[0]),
        "backgroundGradient": gradient(a + 0x38),
        "foregroundGradient": gradient(a + 0x98),
        "glyphBackgroundHex": None if read(a + 0x100, 1)[0] else "%06X" % (u64(a + 0xF8) & 0xFFFFFF),
        "glyphBackgroundP3": bool(read(a + 0x101, 1)[0]),
        "glyphBackgroundOpacity": round(f64(a + 0x108), 4),
        "commands": swift_array(u64(a + 0x110), 16, swift_string),
    }
    defs.append(d)
json.dump(defs, open(f"{S}/block-icon-definitions.json", "w"), indent=1)
for d in defs:
    bg = d["backgroundGradient"]; fg = d["foregroundGradient"]
    print(f'{d["glyph"]:14} {d["title"]:18} bg={d["background"]} fg={d["foreground"]} '
          f'bgGrad={[s["hex"] for s in bg["stops"]] if bg else "-"}{"/"+bg["style"] if bg else ""} '
          f'fgGrad={[s["hex"] for s in fg["stops"]] if fg else "-"} glyphBg={d["glyphBackgroundHex"]}@{d["glyphBackgroundOpacity"]} cmds={d["commands"]}')
