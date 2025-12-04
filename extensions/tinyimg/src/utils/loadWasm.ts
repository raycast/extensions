import TinyImgWASM from "./tinyimg-wasm.js";

interface TinyImgWASMInstance {
  ready: Promise<void>;
  compress: (input: Uint8Array, quality: number) => Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
  _w_compress: (inputPtr: number, inputLen: number, quality: number, isWebp: boolean) => number;
  _drop_vector_struct: (ptr: number) => void;
}
let wasmModule: TinyImgWASMInstance;

export default async function loadWasm(): Promise<TinyImgWASMInstance> {
  return new Promise((resolve, reject) => {
    if (wasmModule) {
      return resolve(wasmModule);
    } else {
      TinyImgWASM({})
        .then((instance: TinyImgWASMInstance) => {
          wasmModule = instance;
          resolve(wasmModule);
        })
        .catch((err: Error) => {
          //console.log("load wasm error:", err);
          reject(err);
        });
    }
  });
}
