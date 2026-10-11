import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isIntelOnlyExecutable, machOCpus, readExecutableHeader } from "../src/lib/macho";

const X86_64 = 0x01000007;
const ARM64 = 0x0100000c;

/** A thin 64-bit Mach-O header: magic 0xfeedfacf and cputype, little-endian. */
function thin(cputype: number): Buffer {
  const b = Buffer.alloc(32);
  b.writeUInt32LE(0xfeedfacf, 0);
  b.writeUInt32LE(cputype, 4);
  return b;
}

/** A universal (fat) header: magic 0xcafebabe, arch count and 20-byte entries, big-endian. */
function fat(...cputypes: number[]): Buffer {
  const b = Buffer.alloc(8 + cputypes.length * 20);
  b.writeUInt32BE(0xcafebabe, 0);
  b.writeUInt32BE(cputypes.length, 4);
  cputypes.forEach((cpu, i) => b.writeUInt32BE(cpu, 8 + i * 20));
  return b;
}

describe("machOCpus", () => {
  it("reads a thin binary's architecture", () => {
    expect(machOCpus(thin(X86_64))).toEqual({ x86_64: true, arm64: false });
    expect(machOCpus(thin(ARM64))).toEqual({ x86_64: false, arm64: true });
  });

  it("reads every architecture of a universal binary", () => {
    expect(machOCpus(fat(X86_64, ARM64))).toEqual({ x86_64: true, arm64: true });
    expect(machOCpus(fat(X86_64))).toEqual({ x86_64: true, arm64: false });
  });

  it("is undefined for scripts and anything that isn't Mach-O", () => {
    expect(machOCpus(Buffer.from("#!/usr/bin/env python3\n"))).toBeUndefined();
    expect(machOCpus(Buffer.alloc(0))).toBeUndefined();
  });

  it("doesn't mistake a Java class file (same 0xcafebabe magic) for a universal binary", () => {
    const javaClass = Buffer.alloc(16);
    javaClass.writeUInt32BE(0xcafebabe, 0);
    javaClass.writeUInt32BE(0x00000041, 4); // class-file version, not an arch count
    expect(machOCpus(javaClass)).toBeUndefined();
  });
});

describe("isIntelOnlyExecutable", () => {
  it("is true only for a Mach-O without an arm64 slice", () => {
    expect(isIntelOnlyExecutable(thin(X86_64))).toBe(true);
    expect(isIntelOnlyExecutable(fat(X86_64))).toBe(true);
    expect(isIntelOnlyExecutable(fat(X86_64, ARM64))).toBe(false);
    expect(isIntelOnlyExecutable(thin(ARM64))).toBe(false);
    expect(isIntelOnlyExecutable(Buffer.from("#!/bin/sh\n"))).toBe(false);
    expect(isIntelOnlyExecutable(undefined)).toBe(false);
  });
});

describe("readExecutableHeader", () => {
  it("reads the start of a file, or undefined when it can't be read", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "macho-")), "bin");
    fs.writeFileSync(file, thin(X86_64));
    expect(machOCpus(readExecutableHeader(file)!)).toEqual({ x86_64: true, arm64: false });
    expect(readExecutableHeader(path.join(os.tmpdir(), "does-not-exist-macho"))).toBeUndefined();
  });

  it.skipIf(process.platform !== "darwin")("recognizes real binaries on this Mac", () => {
    // /bin/ls ships universal (x86_64 + arm64e) on every supported macOS.
    expect(machOCpus(readExecutableHeader("/bin/ls")!)).toEqual({ x86_64: true, arm64: true });
  });
});
