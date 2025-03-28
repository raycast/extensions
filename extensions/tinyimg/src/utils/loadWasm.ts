import TinyImg from "./tinyimg-wasm.js";
import { TinyImgWASMInstance } from "./tinyimg-wasm.d.ts";
let wasmModule: TinyImgWASMInstance;

export default async function loadWasm(): Promise<TinyImgWASMInstance> {
  return new Promise((resolve, reject) => {
    if (wasmModule) {
      return resolve(wasmModule);
    } else {
      TinyImg()
        .then((instance: TinyImgWASMInstance) => {
          wasmModule = instance;
          resolve(wasmModule);
        })
        .catch((err: Error) => {
          console.log("load wasm error:", err);
          reject(err);
        });
    }
  });
}
