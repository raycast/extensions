declare module "./tinyimg-wasm.js" {
  interface TinyImgWASMInstance {
    ready: Promise<void>;
    compress: (input: Uint8Array, quality: number) => Uint8Array;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPU8: Uint8Array;
    _w_compress: (inputPtr: number, inputLen: number, quality: number, isWebp: boolean) => number;
    _drop_vector_struct: (ptr: number) => void;
  }

  interface TinyImgWASMOptions {
    wasmBinary?: Uint8Array;
    noExitRuntime?: boolean;
    arguments?: string[];
    thisProgram?: string;
    quit?: (status: number, toThrow: Error) => void;
    locateFile?: (path: string, scriptDirectory: string) => string;
  }

  function TinyImgWASM(options?: TinyImgWASMOptions): Promise<TinyImgWASMInstance>;
  export default TinyImgWASM;
}
