// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export const FLAG_NO_ENGLISH_GUARD = 1;
export const FLAG_NO_CYRILLIC = 2;
export const FLAG_ASCII_TUTUQ = 4;

export type Target = "new" | "old-official" | "old-ascii" | "cyrillic";

const MODES: Record<Target, number> = {
  new: 0,
  "old-official": 1,
  "old-ascii": 2,
  cyrillic: 3,
};

interface Exports {
  memory: WebAssembly.Memory;
  bitg_alloc(len: number): number;
  bitg_dealloc(ptr: number, len: number): void;
  bitg_run(ptr: number, len: number, mode: number, flags: number): number;
  bitg_out(): number;
}

export interface Core {
  convert(text: string, target: Target, flags?: number): string;
}

export async function createCore(bytes: BufferSource): Promise<Core> {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const x = instance.exports as unknown as Exports;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  return {
    convert(text, target, flags = 0) {
      if (!text) return text;
      const input = enc.encode(text);
      const ptr = x.bitg_alloc(input.length);
      new Uint8Array(x.memory.buffer, ptr, input.length).set(input);
      const n = x.bitg_run(ptr, input.length, MODES[target], flags);
      x.bitg_dealloc(ptr, input.length);
      if (!n) return text;
      const json = dec.decode(new Uint8Array(x.memory.buffer, x.bitg_out(), n));
      return (JSON.parse(json) as { out: string }).out;
    },
  };
}
