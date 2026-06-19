/* @ts-self-types="./apngopt_rs.d.ts" */
import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";

let wasm;
let initialized = false;

function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbindgen_cast_0000000000000001: function (arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: function () {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return {
    __proto__: null,
    "./apngopt_rs_bg.js": import0,
  };
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return new Uint8Array(wasm.memory.buffer).subarray(ptr / 1, ptr / 1 + len);
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return new TextDecoder("utf-8").decode(new Uint8Array(wasm.memory.buffer).subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  new Uint8Array(wasm.memory.buffer).set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

async function init() {
  if (initialized) return;
  const wasmPath = path.join(environment.assetsPath, "apngopt_rs_bg.wasm");
  const wasmBytes = fs.readFileSync(wasmPath);
  const wasmModule = await WebAssembly.compile(wasmBytes);
  const instance = await WebAssembly.instantiate(wasmModule, __wbg_get_imports());
  wasm = instance.exports;
  wasm.__wbindgen_start();
  initialized = true;
}

/**
 * @param {Uint8Array} input_data
 * @param {number} z_method
 * @param {number} iterations
 * @param {number} disable_imagequant
 * @returns {Uint8Array}
 */
export async function optimize_apng_wasm(input_data, z_method, iterations, disable_imagequant) {
  await init();
  const ptr0 = passArray8ToWasm0(input_data, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  try {
    const ret = wasm.optimize_apng_wasm(ptr0, len0, z_method, iterations, disable_imagequant);
    if (ret[3]) {
      throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    // 释放 WASM 返回的结果缓冲区
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
  } catch (e) {
    console.error("WASM execution error:", e);
    throw e;
  }
  // 注意：不要在这里释放 ptr0，因为 WASM 端已经接管并处理了该内存。
}
