/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Copyright 2018 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

"use strict";
import crypto from "crypto";
import { performance } from "perf_hooks";
import { TextEncoder, TextDecoder } from "util";

interface ErrorWithCode extends Error {
  code: string;
}

const enosys = (): ErrorWithCode => {
  const err = new Error("not implemented") as ErrorWithCode;
  err.code = "ENOSYS";
  return err;
};

interface IFileSystem {
  constants: {
    O_WRONLY: number;
    O_RDWR: number;
    O_CREAT: number;
    O_TRUNC: number;
    O_APPEND: number;
    O_EXCL: number;
  };
  outputBuf: string;
  output: string;
  writeSync(fd: number, buf: Uint8Array): number;
  write(
    fd: number,
    buf: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: (err: ErrorWithCode | null, bytesWritten?: number) => void,
  ): void;
  chmod(
    path: string,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  chown(
    path: string,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  close(fd: number, callback: (err: ErrorWithCode) => void): void;
  fchmod(
    fd: number,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  fchown(
    fd: number,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  fstat(fd: number, callback: (err: ErrorWithCode) => void): void;
  fsync(fd: number, callback: (err: ErrorWithCode | null) => void): void;
  ftruncate(
    fd: number,
    length: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  lchown(
    path: string,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  link(
    path: string,
    link: string,
    callback: (err: ErrorWithCode) => void,
  ): void;
  lstat(path: string, callback: (err: ErrorWithCode) => void): void;
  mkdir(
    path: string,
    perm: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  open(
    path: string,
    flags: number,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  read(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  readdir(path: string, callback: (err: ErrorWithCode) => void): void;
  readlink(path: string, callback: (err: ErrorWithCode) => void): void;
  rename(
    from: string,
    to: string,
    callback: (err: ErrorWithCode) => void,
  ): void;
  rmdir(path: string, callback: (err: ErrorWithCode) => void): void;
  stat(path: string, callback: (err: ErrorWithCode) => void): void;
  symlink(
    path: string,
    link: string,
    callback: (err: ErrorWithCode) => void,
  ): void;
  truncate(
    path: string,
    length: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
  unlink(path: string, callback: (err: ErrorWithCode) => void): void;
  utimes(
    path: string,
    atime: number,
    mtime: number,
    callback: (err: ErrorWithCode) => void,
  ): void;
}

interface MockProcess {
  getuid(): number;
  getgid(): number;
  geteuid(): number;
  getegid(): number;
  getgroups(): never;
  pid: number;
  ppid: number;
  umask(): never;
  cwd(): never;
  chdir(): never;
}

class FileSystem {
  public constants = {
    O_WRONLY: -1,
    O_RDWR: -1,
    O_CREAT: -1,
    O_TRUNC: -1,
    O_APPEND: -1,
    O_EXCL: -1,
  }; // unused
  public outputBuf = "";
  public output = "";

  constructor() {
    this.outputBuf = "";
    this.output = "";
  }

  writeSync(fd: number, buf: Uint8Array): number {
    this.outputBuf += decoder.decode(buf);
    const nl = this.outputBuf.lastIndexOf("\n");
    if (nl != -1) {
      this.output += this.outputBuf.substring(0, nl);
      this.outputBuf = this.outputBuf.substring(nl + 1);
    }
    return buf.length;
  }
  write(
    fd: number,
    buf: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: (err: ErrorWithCode | null, bytesWritten?: number) => void,
  ): void {
    if (offset !== 0 || length !== buf.length || position !== null) {
      callback(enosys());
      return;
    }
    const n = this.writeSync(fd, buf);
    callback(null, n);
  }
  chmod(
    path: string,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  chown(
    path: string,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  close(fd: number, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  fchmod(
    fd: number,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  fchown(
    fd: number,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  fstat(fd: number, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  fsync(fd: number, callback: (err: ErrorWithCode | null) => void): void {
    callback(null);
  }
  ftruncate(
    fd: number,
    length: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  lchown(
    path: string,
    uid: number,
    gid: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  link(
    path: string,
    link: string,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  lstat(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  mkdir(
    path: string,
    perm: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  open(
    path: string,
    flags: number,
    mode: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  read(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  readdir(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  readlink(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  rename(
    from: string,
    to: string,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  rmdir(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  stat(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  symlink(
    path: string,
    link: string,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  truncate(
    path: string,
    length: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
  unlink(path: string, callback: (err: ErrorWithCode) => void): void {
    callback(enosys());
  }
  utimes(
    path: string,
    atime: number,
    mtime: number,
    callback: (err: ErrorWithCode) => void,
  ): void {
    callback(enosys());
  }
}

class WaGlobalThis {
  public fs: FileSystem;
  public Go: GoClass;
  constructor(Go: GoClass) {
    this.fs = new FileSystem();
    this.Go = Go;
  }
  getuid(): number {
    return -1;
  }
  getgid(): number {
    return -1;
  }
  geteuid(): number {
    return -1;
  }
  getegid(): number {
    return -1;
  }
  getgroups(): never {
    throw enosys();
  }
  public pid = -1;
  public ppid = -1;
  umask(): never {
    throw enosys();
  }
  cwd(): never {
    throw enosys();
  }
  chdir(): never {
    throw enosys();
  }
  public crypto = crypto;
  public performance = performance;
  public TextEncoder = TextEncoder;
  public TextDecoder = TextDecoder;
  public Uint8Array = Uint8Array;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

interface WasmInstance extends WebAssembly.Instance {
  exports: {
    mem: WebAssembly.Memory;
    run: (argc: number, argv: number) => void;
    resume: () => void;
    getsp: () => number;
  };
}

interface PendingEvent {
  id: number;
  this: any;
  args: IArguments;
  result?: any;
}

export class GoClass {
  public argv: string[];
  public env: Record<string, string>;
  public exit: (code: number) => void;
  public exited: boolean = false;

  private _exitPromise: Promise<void>;
  private _resolveExitPromise!: () => void;
  private _pendingEvent: PendingEvent | null = null;
  private _scheduledTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private _nextCallbackTimeoutID: number = 1;
  private _inst!: WasmInstance;
  private _values!: any[];
  private _goRefCounts!: number[];
  private _ids!: Map<any, number>;
  private _idPool!: number[];
  public mem!: DataView;
  public importObject: WebAssembly.Imports;

  public waGlobalThis: WaGlobalThis;

  constructor() {
    this.argv = ["js"];
    this.env = {};
    this.exit = (code: number) => {
      if (code !== 0) {
        console.warn("exit code:", code);
      }
    };
    this._exitPromise = new Promise((resolve) => {
      this._resolveExitPromise = resolve;
    });

    const setInt64 = (addr: number, v: number): void => {
      this.mem.setUint32(addr + 0, v, true);
      this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);
    };

    const setInt32 = (addr: number, v: number): void => {
      this.mem.setUint32(addr + 0, v, true);
    };

    const getInt64 = (addr: number): number => {
      const low = this.mem.getUint32(addr + 0, true);
      const high = this.mem.getInt32(addr + 4, true);
      return low + high * 4294967296;
    };

    const loadValue = (addr: number): any => {
      const f = this.mem.getFloat64(addr, true);
      if (f === 0) {
        return undefined;
      }
      if (!isNaN(f)) {
        return f;
      }

      const id = this.mem.getUint32(addr, true);
      return this._values[id];
    };

    const storeValue = (addr: number, v: any): void => {
      const nanHead = 0x7ff80000;

      if (typeof v === "number" && v !== 0) {
        if (isNaN(v)) {
          this.mem.setUint32(addr + 4, nanHead, true);
          this.mem.setUint32(addr, 0, true);
          return;
        }
        this.mem.setFloat64(addr, v, true);
        return;
      }

      if (v === undefined) {
        this.mem.setFloat64(addr, 0, true);
        return;
      }

      let id = this._ids.get(v);
      if (id === undefined) {
        id = this._idPool.pop();
        if (id === undefined) {
          id = this._values.length;
        }
        this._values[id] = v;
        this._goRefCounts[id] = 0;
        this._ids.set(v, id);
      }
      this._goRefCounts[id]++;
      let typeFlag = 0;
      switch (typeof v) {
        case "object":
          if (v !== null) {
            typeFlag = 1;
          }
          break;
        case "string":
          typeFlag = 2;
          break;
        case "symbol":
          typeFlag = 3;
          break;
        case "function":
          typeFlag = 4;
          break;
      }
      this.mem.setUint32(addr + 4, nanHead | typeFlag, true);
      this.mem.setUint32(addr, id, true);
    };

    const loadSlice = (addr: number): Uint8Array => {
      const array = getInt64(addr + 0);
      const len = getInt64(addr + 8);
      return new Uint8Array(this._inst.exports.mem.buffer, array, len);
    };

    const loadSliceOfValues = (addr: number): any[] => {
      const array = getInt64(addr + 0);
      const len = getInt64(addr + 8);
      const a = new Array(len);
      for (let i = 0; i < len; i++) {
        a[i] = loadValue(array + i * 8);
      }
      return a;
    };

    const loadString = (addr: number): string => {
      const saddr = getInt64(addr + 0);
      const len = getInt64(addr + 8);
      return decoder.decode(
        new DataView(this._inst.exports.mem.buffer, saddr, len),
      );
    };

    const timeOrigin = Date.now() - performance.now();
    this.importObject = {
      _gotest: {
        add: (a: number, b: number) => a + b,
      },
      gojs: {
        // Go's SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)
        // may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported
        // function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).
        // This changes the SP, thus we have to update the SP used by the imported function.

        // func wasmExit(code int32)
        "runtime.wasmExit": (sp: number) => {
          sp >>>= 0;
          const code = this.mem.getInt32(sp + 8, true);
          this.exited = true;
          delete (this as any)._inst;
          delete (this as any)._values;
          delete (this as any)._goRefCounts;
          delete (this as any)._ids;
          delete (this as any)._idPool;
          this.exit(code);
        },

        // func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)
        "runtime.wasmWrite": (sp: number) => {
          sp >>>= 0;
          const fd = getInt64(sp + 8);
          const p = getInt64(sp + 16);
          const n = this.mem.getInt32(sp + 24, true);
          this.waGlobalThis.fs.writeSync(
            fd,
            new Uint8Array(this._inst.exports.mem.buffer, p, n),
          );
        },

        // func resetMemoryDataView()
        "runtime.resetMemoryDataView": (sp: number) => {
          sp >>>= 0;
          this.mem = new DataView(this._inst.exports.mem.buffer);
        },

        // func nanotime1() int64
        "runtime.nanotime1": (sp: number) => {
          sp >>>= 0;
          setInt64(sp + 8, (timeOrigin + performance.now()) * 1000000);
        },

        // func walltime() (sec int64, nsec int32)
        "runtime.walltime": (sp: number) => {
          sp >>>= 0;
          const msec = new Date().getTime();
          setInt64(sp + 8, msec / 1000);
          this.mem.setInt32(sp + 16, (msec % 1000) * 1000000, true);
        },

        // func scheduleTimeoutEvent(delay int64) int32
        "runtime.scheduleTimeoutEvent": (sp: number) => {
          sp >>>= 0;
          const id = this._nextCallbackTimeoutID;
          this._nextCallbackTimeoutID++;
          this._scheduledTimeouts.set(
            id,
            setTimeout(
              () => {
                this._resume();
                while (this._scheduledTimeouts.has(id)) {
                  // for some reason Go failed to register the timeout event, log and try again
                  // (temporary workaround for https://github.com/golang/go/issues/28975)
                  console.warn("scheduleTimeoutEvent: missed timeout event");
                  this._resume();
                }
              },
              getInt64(sp + 8),
            ),
          );
          this.mem.setInt32(sp + 16, id, true);
        },

        // func clearTimeoutEvent(id int32)
        "runtime.clearTimeoutEvent": (sp: number) => {
          sp >>>= 0;
          const id = this.mem.getInt32(sp + 8, true);
          clearTimeout(this._scheduledTimeouts.get(id));
          this._scheduledTimeouts.delete(id);
        },

        // func getRandomData(r []byte)
        "runtime.getRandomData": (sp: number) => {
          sp >>>= 0;
          crypto.getRandomValues(loadSlice(sp + 8));
        },

        // func finalizeRef(v ref)
        "syscall/js.finalizeRef": (sp: number) => {
          sp >>>= 0;
          const id = this.mem.getUint32(sp + 8, true);
          this._goRefCounts[id]--;
          if (this._goRefCounts[id] === 0) {
            const v = this._values[id];
            this._values[id] = null;
            this._ids.delete(v);
            this._idPool.push(id);
          }
        },

        // func stringVal(value string) ref
        "syscall/js.stringVal": (sp: number) => {
          sp >>>= 0;
          storeValue(sp + 24, loadString(sp + 8));
        },

        // func valueGet(v ref, p string) ref
        "syscall/js.valueGet": (sp: number) => {
          sp >>>= 0;
          const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));
          sp = this._inst.exports.getsp() >>> 0; // see comment above
          storeValue(sp + 32, result);
        },

        // func valueSet(v ref, p string, x ref)
        "syscall/js.valueSet": (sp: number) => {
          sp >>>= 0;
          Reflect.set(
            loadValue(sp + 8),
            loadString(sp + 16),
            loadValue(sp + 32),
          );
        },

        // func valueDelete(v ref, p string)
        "syscall/js.valueDelete": (sp: number) => {
          sp >>>= 0;
          Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));
        },

        // func valueIndex(v ref, i int) ref
        "syscall/js.valueIndex": (sp: number) => {
          sp >>>= 0;
          storeValue(
            sp + 24,
            Reflect.get(loadValue(sp + 8), getInt64(sp + 16)),
          );
        },

        // valueSetIndex(v ref, i int, x ref)
        "syscall/js.valueSetIndex": (sp: number) => {
          sp >>>= 0;
          Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));
        },

        // func valueCall(v ref, m string, args []ref) (ref, bool)
        "syscall/js.valueCall": (sp: number) => {
          sp >>>= 0;
          try {
            const v = loadValue(sp + 8);
            const m = Reflect.get(v, loadString(sp + 16));
            const args = loadSliceOfValues(sp + 32);
            const result = Reflect.apply(m, v, args);
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 56, result);
            this.mem.setUint8(sp + 64, 1);
          } catch (err) {
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 56, err);
            this.mem.setUint8(sp + 64, 0);
          }
        },

        // func valueInvoke(v ref, args []ref) (ref, bool)
        "syscall/js.valueInvoke": (sp: number) => {
          sp >>>= 0;
          try {
            const v = loadValue(sp + 8);
            const args = loadSliceOfValues(sp + 16);
            const result = Reflect.apply(v, undefined, args);
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 40, result);
            this.mem.setUint8(sp + 48, 1);
          } catch (err) {
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 40, err);
            this.mem.setUint8(sp + 48, 0);
          }
        },

        // func valueNew(v ref, args []ref) (ref, bool)
        "syscall/js.valueNew": (sp: number) => {
          sp >>>= 0;
          try {
            const v = loadValue(sp + 8);
            const args = loadSliceOfValues(sp + 16);
            const result = Reflect.construct(v, args);
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 40, result);
            this.mem.setUint8(sp + 48, 1);
          } catch (err) {
            sp = this._inst.exports.getsp() >>> 0; // see comment above
            storeValue(sp + 40, err);
            this.mem.setUint8(sp + 48, 0);
          }
        },

        // func valueLength(v ref) int
        "syscall/js.valueLength": (sp: number) => {
          sp >>>= 0;
          setInt64(sp + 16, parseInt(loadValue(sp + 8).length));
        },

        // valuePrepareString(v ref) (ref, int)
        "syscall/js.valuePrepareString": (sp: number) => {
          sp >>>= 0;
          const str = encoder.encode(String(loadValue(sp + 8)));
          storeValue(sp + 16, str);
          setInt64(sp + 24, str.length);
        },

        // valueLoadString(v ref, b []byte)
        "syscall/js.valueLoadString": (sp: number) => {
          sp >>>= 0;
          const str = loadValue(sp + 8);
          loadSlice(sp + 16).set(str);
        },

        // func valueInstanceOf(v ref, t ref) bool
        "syscall/js.valueInstanceOf": (sp: number) => {
          sp >>>= 0;
          this.mem.setUint8(
            sp + 24,
            loadValue(sp + 8) instanceof loadValue(sp + 16) ? 1 : 0,
          );
        },

        // func copyBytesToGo(dst []byte, src ref) (int, bool)
        "syscall/js.copyBytesToGo": (sp: number) => {
          sp >>>= 0;
          const dst = loadSlice(sp + 8);
          const src = loadValue(sp + 32);
          if (
            !(src instanceof Uint8Array || src instanceof Uint8ClampedArray)
          ) {
            this.mem.setUint8(sp + 48, 0);
            return;
          }
          const toCopy = src.subarray(0, dst.length);
          dst.set(toCopy);
          setInt64(sp + 40, toCopy.length);
          this.mem.setUint8(sp + 48, 1);
        },

        // func copyBytesToJS(dst ref, src []byte) (int, bool)
        "syscall/js.copyBytesToJS": (sp: number) => {
          sp >>>= 0;
          const dst = loadValue(sp + 8);
          const src = loadSlice(sp + 16);
          if (
            !(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)
          ) {
            this.mem.setUint8(sp + 48, 0);
            return;
          }
          const toCopy = src.subarray(0, dst.length);
          dst.set(toCopy);
          setInt64(sp + 40, toCopy.length);
          this.mem.setUint8(sp + 48, 1);
        },

        debug: (value: any) => {
          console.log(value);
        },
      },
    };

    this.waGlobalThis = new WaGlobalThis(this);
  }

  async run(instance: WebAssembly.Instance): Promise<void> {
    if (!(instance instanceof WebAssembly.Instance)) {
      throw new Error("Go.run: WebAssembly.Instance expected");
    }
    this._inst = instance as WasmInstance;
    this.mem = new DataView(this._inst.exports.mem.buffer);
    this._values = [
      // JS values that Go currently has references to, indexed by reference id
      NaN,
      0,
      null,
      true,
      false,
      this.waGlobalThis,
      this,
    ];
    this._goRefCounts = new Array(this._values.length).fill(Infinity); // number of references that Go has to a JS value, indexed by reference id
    this._ids = new Map(); // mapping from JS values to reference ids
    this._ids.set(0, 1);
    this._ids.set(null, 2);
    this._ids.set(true, 3);
    this._ids.set(false, 4);
    this._ids.set(this.waGlobalThis, 5);
    this._ids.set(this, 6);
    this._idPool = []; // unused ids that have been garbage collected
    this.exited = false; // whether the Go program has exited

    // Pass command line arguments and environment variables to WebAssembly by writing them to the linear memory.
    let offset = 4096;

    const strPtr = (str: string): number => {
      const ptr = offset;
      const bytes = encoder.encode(str + "\0");
      new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);
      offset += bytes.length;
      if (offset % 8 !== 0) {
        offset += 8 - (offset % 8);
      }
      return ptr;
    };

    const argc = this.argv.length;

    const argvPtrs: number[] = [];
    this.argv.forEach((arg) => {
      argvPtrs.push(strPtr(arg));
    });
    argvPtrs.push(0);

    const keys = Object.keys(this.env).sort();
    keys.forEach((key) => {
      argvPtrs.push(strPtr(`${key}=${this.env[key]}`));
    });
    argvPtrs.push(0);

    const argv = offset;
    argvPtrs.forEach((ptr) => {
      this.mem.setUint32(offset, ptr, true);
      this.mem.setUint32(offset + 4, 0, true);
      offset += 8;
    });

    // The linker guarantees global data starts from at least wasmMinDataAddr.
    // Keep in sync with cmd/link/internal/ld/data.go:wasmMinDataAddr.
    const wasmMinDataAddr = 4096 + 8192;
    if (offset >= wasmMinDataAddr) {
      throw new Error(
        "total length of command line and environment variables exceeds limit",
      );
    }

    this._inst.exports.run(argc, argv);
    if (this.exited) {
      this._resolveExitPromise();
    }
    await this._exitPromise;
  }

  _resume(): void {
    if (this.exited) {
      throw new Error("Go program has already exited");
    }
    this._inst.exports.resume();
    if (this.exited) {
      this._resolveExitPromise();
    }
  }

  _makeFuncWrapper(id: number): (...args: any[]) => any {
    const go = this;
    return function (this: any, ...args: any[]): any {
      const event: PendingEvent = { id: id, this: this, args: arguments };
      go._pendingEvent = event;
      go._resume();
      return event.result;
    };
  }
}
