import * as fs from "node:fs";

// Mach-O magic numbers and CPU types, from <mach-o/loader.h> and <mach-o/fat.h>.
const MH_MAGIC = 0xfeedface;
const MH_MAGIC_64 = 0xfeedfacf;
const FAT_MAGIC = 0xcafebabe;
const FAT_MAGIC_64 = 0xcafebabf;
const CPU_ARCH_MASK = 0xff; // low byte: the CPU family (7 = x86, 12 = ARM)
const CPU_FAMILY_X86 = 7;
const CPU_FAMILY_ARM = 12;
/** Real universal binaries hold a handful of slices; Java class files share FAT_MAGIC with a version here instead. */
const MAX_FAT_ARCHS = 20;

export type MachOCpus = { x86_64: boolean; arm64: boolean };

function cpusOf(cputypes: number[]): MachOCpus {
  return {
    x86_64: cputypes.some((cpu) => (cpu & CPU_ARCH_MASK) === CPU_FAMILY_X86),
    arm64: cputypes.some((cpu) => (cpu & CPU_ARCH_MASK) === CPU_FAMILY_ARM),
  };
}

/** Which CPUs a Mach-O executable's header says it runs on, or undefined when it isn't Mach-O (a script, say). */
export function machOCpus(header: Buffer): MachOCpus | undefined {
  if (header.length < 8) return undefined;
  const le = header.readUInt32LE(0);
  if (le === MH_MAGIC || le === MH_MAGIC_64) return cpusOf([header.readUInt32LE(4)]);
  const be = header.readUInt32BE(0);
  if (be !== FAT_MAGIC && be !== FAT_MAGIC_64) return undefined;
  const count = header.readUInt32BE(4);
  const entrySize = be === FAT_MAGIC_64 ? 32 : 20;
  if (count === 0 || count > MAX_FAT_ARCHS || header.length < 8 + count * entrySize) return undefined;
  return cpusOf(Array.from({ length: count }, (_, i) => header.readUInt32BE(8 + i * entrySize)));
}

/** True for a Mach-O executable with an Intel slice and no ARM one — it needs Rosetta on Apple Silicon. */
export function isIntelOnlyExecutable(header: Buffer | undefined): boolean {
  const cpus = header ? machOCpus(header) : undefined;
  return !!cpus && cpus.x86_64 && !cpus.arm64;
}

/** The first `bytes` of a file, or undefined when it can't be read. */
export function readExecutableHeader(filePath: string, bytes = 4096): Buffer | undefined {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(bytes);
    return buffer.subarray(0, fs.readSync(fd, buffer, 0, bytes, 0));
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
