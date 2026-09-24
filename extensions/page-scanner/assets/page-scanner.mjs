#!/usr/bin/env node
// @page-scanner/cli 0.3.1, Apache-2.0, bundled by scripts/vendor-cli.mjs.
import { createRequire as __psCreateRequire } from 'node:module';
import { fileURLToPath as __psFileURLToPath } from 'node:url';
import { dirname as __psDirname } from 'node:path';
globalThis.require ??= __psCreateRequire(import.meta.url);
const __filename = __psFileURLToPath(import.meta.url);
const __dirname = __psDirname(__filename);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@page-scanner/cli/dist/errors.js
function isPageScannerError(value) {
  return value instanceof PageScannerError;
}
function toPageScannerError(value) {
  if (isPageScannerError(value))
    return value;
  if (value instanceof Error)
    return new PageScannerError("SCAN_FAILED", value.message);
  return new PageScannerError("SCAN_FAILED", String(value));
}
function exitCodeFor(code2) {
  switch (code2) {
    case "BAD_REQUEST":
      return 2;
    case "NO_BROWSER":
    case "AMBIGUOUS_BROWSER":
    case "UNKNOWN_BROWSER":
      return 3;
    case "NOT_PAIRED":
      return 4;
    case "DAEMON_FAILED":
    case "PORT_IN_USE":
      return 5;
    case "TIMEOUT":
    case "BROWSER_GONE":
    case "SCAN_FAILED":
      return 1;
  }
}
var PAIR_COMMAND, INSTALL_COMMAND, CONNECT_HINT, PageScannerError;
var init_errors = __esm({
  "node_modules/@page-scanner/cli/dist/errors.js"() {
    PAIR_COMMAND = "npx @page-scanner/cli pair";
    INSTALL_COMMAND = "npx @page-scanner/cli install";
    CONNECT_HINT = `If Page Scanner is not set up on this computer yet, run \`${INSTALL_COMMAND}\`. Then open the extension's settings, Local agents, and press Connect.`;
    PageScannerError = class extends Error {
      code;
      /** A second line of help, printed under the message. */
      hint;
      constructor(code2, message, hint) {
        super(message);
        this.name = "PageScannerError";
        this.code = code2;
        this.hint = hint;
      }
    };
  }
});

// node_modules/@page-scanner/cli/dist/protocol.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
function isRequestId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isHelloFrame(value) {
  return isRecord(value) && value.type === "hello" && isFiniteNumber(value.protocol) && typeof value.token === "string" && isNonEmptyString(value.browserId) && typeof value.label === "string" && typeof value.extensionVersion === "string" && (value.features === void 0 || Array.isArray(value.features) && value.features.every((f) => typeof f === "string"));
}
function isPingFrame(value) {
  return isRecord(value) && value.type === "ping";
}
function isWindowSummary(value) {
  return isRecord(value) && Number.isInteger(value.windowId) && typeof value.focused === "boolean" && typeof value.windowType === "string" && Number.isInteger(value.tabCount);
}
function isTabSummary(value) {
  return isRecord(value) && Number.isInteger(value.tabId) && Number.isInteger(value.windowId) && typeof value.url === "string" && typeof value.title === "string" && typeof value.active === "boolean";
}
function isTruncationReport(value) {
  return isRecord(value) && isFiniteNumber(value.requestedWidth) && isFiniteNumber(value.requestedHeight) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && typeof value.message === "string";
}
function isTabsResponse(value) {
  return isRecord(value) && value.type === "tabs" && isRequestId(value.id) && Array.isArray(value.windows) && value.windows.every(isWindowSummary) && Array.isArray(value.tabs) && value.tabs.every(isTabSummary);
}
function isStructuredPage(value) {
  return isRecord(value) && typeof value.markdown === "string" && typeof value.title === "string" && typeof value.url === "string" && isFiniteNumber(value.capturedAt) && (value.language === null || typeof value.language === "string") && Array.isArray(value.headings) && value.headings.every((heading) => isRecord(heading) && isFiniteNumber(heading.level) && typeof heading.text === "string");
}
function isCleanupReport(value) {
  return isRecord(value) && CLEANUP_KINDS.every((kind) => typeof value[kind] === "number" && Number.isInteger(value[kind]) && value[kind] >= 0);
}
function isScanResultResponse(value) {
  return isRecord(value) && value.type === "scan-result" && isRequestId(value.id) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && (value.mode === "vector" || value.mode === "raster") && isNonEmptyString(value.fileName) && typeof value.bytesBase64 === "string" && (value.truncated === void 0 || isTruncationReport(value.truncated)) && (value.structured === void 0 || isStructuredPage(value.structured)) && (value.hidden === void 0 || isCleanupReport(value.hidden));
}
function isCountMap(value) {
  return isRecord(value) && Object.values(value).every((count) => typeof count === "number" && Number.isInteger(count));
}
function isSchemeExtract(value) {
  return isRecord(value) && isRecord(value.variables) && Object.values(value.variables).every((v) => typeof v === "string") && typeof value.canvas === "string" && isRecord(value.values) && Object.values(value.values).every(isCountMap) && Array.isArray(value.text) && value.text.every((pair2) => isRecord(pair2) && typeof pair2.color === "string" && typeof pair2.background === "string" && isFiniteNumber(pair2.size) && isFiniteNumber(pair2.weight) && isFiniteNumber(pair2.count) && (pair2.overImage === void 0 || typeof pair2.overImage === "boolean")) && isFiniteNumber(value.elements) && isFiniteNumber(value.textRuns);
}
function isDesignExtractResponse(value) {
  if (!isRecord(value) || value.type !== "design-extract" || !isRequestId(value.id))
    return false;
  const extract = value.extract;
  return isRecord(extract) && typeof extract.url === "string" && typeof extract.title === "string" && isFiniteNumber(extract.capturedAt) && isRecord(extract.viewport) && isFiniteNumber(extract.viewport.width) && isFiniteNumber(extract.viewport.height) && isRecord(extract.schemes) && isSchemeExtract(extract.schemes.light) && isSchemeExtract(extract.schemes.dark) && Array.isArray(extract.breakpoints) && extract.breakpoints.every(isFiniteNumber) && (value.links === void 0 || Array.isArray(value.links) && value.links.length <= MAX_DESIGN_LINKS && value.links.every((link) => typeof link === "string")) && (value.components === void 0 || isComponentsExtract(value.components));
}
function isComponentStyle(value, partial) {
  if (!isRecord(value))
    return false;
  return DESIGN_COMPONENT_STYLE_KEYS.every((key) => partial && value[key] === void 0 ? true : typeof value[key] === "string");
}
function isComponentCandidate(value) {
  return isRecord(value) && typeof value.tag === "string" && (value.role === void 0 || typeof value.role === "string") && typeof value.classes === "string" && typeof value.skeleton === "string" && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && isComponentStyle(value.style, false) && (value.disabled === void 0 || typeof value.disabled === "boolean") && (value.label === void 0 || typeof value.label === "string") && (value.hover === void 0 || isComponentStyle(value.hover, true)) && (value.focus === void 0 || isComponentStyle(value.focus, true));
}
function isComponentsExtract(value) {
  return isRecord(value) && isRequestId(value.captureId) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && Array.isArray(value.candidates) && value.candidates.length <= MAX_COMPONENT_CANDIDATES && value.candidates.every(isComponentCandidate);
}
function isDesignCatalogResponse(value) {
  return isRecord(value) && value.type === "design-catalog" && isRequestId(value.id) && typeof value.bytesBase64 === "string";
}
function isErrorResponse(value) {
  return isRecord(value) && value.type === "error" && isRequestId(value.id) && typeof value.message === "string";
}
function isBridgeResponse(value) {
  return isTabsResponse(value) || isScanResultResponse(value) || isDesignExtractResponse(value) || isDesignCatalogResponse(value) || isErrorResponse(value);
}
function parseInbound(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (isHelloFrame(value))
    return value;
  if (isPingFrame(value))
    return value;
  if (isBridgeResponse(value))
    return value;
  return null;
}
function helloAck() {
  return { type: "hello-ok" };
}
function helloReject(message) {
  return { type: "hello-error", message };
}
var BRIDGE_PROTOCOL_VERSION, EXPORT_FORMAT_IDS, STRUCTURED_MODES, PAGE_SIZE_IDS, DEFAULT_PAGE_SIZE, VIDEO_HANDLINGS, COLOR_SCHEME_PREFERENCES, CAPTURE_WIDTHS, CLEANUP_KINDS, MAX_DESIGN_LINKS, DESIGN_COMPONENT_STYLE_KEYS, MAX_COMPONENT_CANDIDATES, NATIVE_HOST_NAME, NATIVE_TO_HOST_CHUNK_CHARS, NATIVE_FROM_HOST_CHUNK_CHARS;
var init_protocol = __esm({
  "node_modules/@page-scanner/cli/dist/protocol.js"() {
    BRIDGE_PROTOCOL_VERSION = 1;
    EXPORT_FORMAT_IDS = ["pdf", "png", "jpeg"];
    STRUCTURED_MODES = ["alongside", "only"];
    PAGE_SIZE_IDS = ["auto", "a4", "letter"];
    DEFAULT_PAGE_SIZE = "a4";
    VIDEO_HANDLINGS = ["frame", "blank"];
    COLOR_SCHEME_PREFERENCES = ["auto", "light", "dark"];
    CAPTURE_WIDTHS = ["window", "a4", "letter"];
    CLEANUP_KINDS = ["ads", "consent", "chat", "overlays"];
    MAX_DESIGN_LINKS = 500;
    DESIGN_COMPONENT_STYLE_KEYS = [
      "background",
      "color",
      "borderColor",
      "borderWidth",
      "borderStyle",
      "radius",
      "padding",
      "fontSize",
      "fontWeight",
      "fontFamily",
      "shadow"
    ];
    MAX_COMPONENT_CANDIDATES = 2e3;
    NATIVE_HOST_NAME = "app.pagescanner.bridge";
    NATIVE_TO_HOST_CHUNK_CHARS = 8 * 1024 * 1024;
    NATIVE_FROM_HOST_CHUNK_CHARS = 128 * 1024;
  }
});

// node_modules/@page-scanner/cli/dist/config.js
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function configDir() {
  return process.env.PAGE_SCANNER_HOME ?? join(homedir(), ".page-scanner");
}
function configPath() {
  return join(configDir(), "config.json");
}
function readConfig() {
  try {
    const raw = JSON.parse(readFileSync(configPath(), "utf8"));
    const record = typeof raw === "object" && raw !== null ? raw : {};
    return {
      port: Number(record.port) || DEFAULT_PORT,
      token: typeof record.token === "string" ? record.token : ""
    };
  } catch {
    return { port: DEFAULT_PORT, token: "" };
  }
}
function ensureConfig({ port, rotate = false } = {}) {
  const current = readConfig();
  const next = {
    port: port ?? current.port,
    token: rotate || !current.token ? randomBytes(32).toString("base64url") : current.token
  };
  mkdirSync(configDir(), { recursive: true, mode: 448 });
  writeFileSync(configPath(), `${JSON.stringify(next, null, 2)}
`, { mode: 384 });
  chmodSync(configPath(), 384);
  return next;
}
function configFileIsOwnerOnly() {
  return process.platform !== "win32";
}
var DEFAULT_PORT;
var init_config = __esm({
  "node_modules/@page-scanner/cli/dist/config.js"() {
    DEFAULT_PORT = 45711;
  }
});

// node_modules/@page-scanner/cli/dist/version.js
import { readFileSync as readFileSync2 } from "node:fs";
function cliBuild() {
  if (build === void 0) {
    try {
      const parsed = JSON.parse(readFileSync2(new URL("./build-id.json", import.meta.url), "utf8"));
      const value = typeof parsed === "object" && parsed !== null ? parsed.build : void 0;
      build = typeof value === "string" && value !== "" ? value : null;
    } catch {
      build = null;
    }
  }
  return build ?? void 0;
}
var CLI_VERSION, build;
var init_version = __esm({
  "node_modules/@page-scanner/cli/dist/version.js"() {
    CLI_VERSION = "0.3.1";
  }
});

// node_modules/@page-scanner/cli/dist/daemon/state.js
import { chmodSync as chmodSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync3, renameSync, rmSync, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join4 } from "node:path";
function daemonStatePath() {
  return join4(configDir(), "daemon.json");
}
function daemonLogPath() {
  return join4(configDir(), "daemon.log");
}
function isPort(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 65535;
}
function isNonEmptyString2(value) {
  return typeof value === "string" && value.length > 0;
}
function readDaemonState() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync3(daemonStatePath(), "utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null)
    return null;
  const record = parsed;
  const { pid, rpcPort, secret, bridgePort, version, startedAt } = record;
  if (!isPort(rpcPort) || !isPort(bridgePort))
    return null;
  if (!isNonEmptyString2(secret) || !isNonEmptyString2(version))
    return null;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0)
    return null;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt))
    return null;
  if (!processAlive(pid))
    return null;
  return { pid, rpcPort, secret, bridgePort, version, startedAt };
}
function writeDaemonState(state) {
  mkdirSync3(configDir(), { recursive: true, mode: 448 });
  const temporary = `${daemonStatePath()}.tmp`;
  writeFileSync3(temporary, `${JSON.stringify(state, null, 2)}
`, { mode: 384 });
  chmodSync2(temporary, 384);
  renameSync(temporary, daemonStatePath());
}
function clearDaemonState() {
  try {
    rmSync(daemonStatePath(), { force: true });
  } catch {
  }
}
function errorCode(error) {
  if (typeof error !== "object" || error === null || !("code" in error))
    return void 0;
  return typeof error.code === "string" ? error.code : void 0;
}
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0)
    return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errorCode(error) === "EPERM";
  }
}
var init_state = __esm({
  "node_modules/@page-scanner/cli/dist/daemon/state.js"() {
    init_config();
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source2, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source2[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source2, mask, output, offset, length) {
          if (length < 48) _mask(source2, mask, output, offset, length);
          else bufferUtil.mask(source2, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk2) {
      this[kBuffers].push(chunk2);
      this[kTotalLength] += chunk2.length;
    }
    function inflateOnData(chunk2) {
      this[kTotalLength] += chunk2.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk2);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code2) {
      return code2 >= 1e3 && code2 <= 1014 && code2 !== 1004 && code2 !== 1005 && code2 !== 1006 || code2 >= 3e3 && code2 <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk2, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk2.length;
        this._buffers.push(chunk2);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code2 = data.readUInt16BE(0);
            if (!isValidStatusCode(code2)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code2}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code2, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode2) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode2;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code2, data, mask, cb) {
        let buf;
        if (code2 === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code2 !== "number" || !isValidStatusCode(code2)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code2, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code2, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code2, message) {
            const event = new CloseEvent("close", {
              code: code2,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse2(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code2 = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code2 = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code2] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code2 === 32 || code2 === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code2 === 59 || code2 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code2 === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code2] === 1) {
            if (start === -1) start = i;
          } else if (code2 === 32 || code2 === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code2 === 59 || code2 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code2 === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code2 === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code2] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code2] === 1) {
              if (start === -1) start = i;
            } else if (code2 === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code2 === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code2 === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code2] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code2 === 32 || code2 === 9)) {
            if (end === -1) end = i;
          } else if (code2 === 59 || code2 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code2 === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code2 === 32 || code2 === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse: parse2 };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes: randomBytes3, createHash: createHash2 } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse: parse2 } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter2 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code2, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code2, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes3(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts2 = opts.path.split(":");
        opts.socketPath = parts2[0];
        opts.path = parts2[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash2("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse2(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code2, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code2;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code2 === 1005) websocket.close();
      else websocket.close(code2, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk2 = this.read(this._readableState.length);
        websocket._receiver.write(chunk2);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk2) {
      if (!this[kWebSocket]._receiver.write(chunk2)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk2, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk2, encoding, callback);
          });
          return;
        }
        ws.send(chunk2, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse2(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code2 = header.charCodeAt(i);
        if (end === -1 && tokenChars[code2] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code2 === 32 || code2 === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code2 === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse: parse2 };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash: createHash2 } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter2 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code2, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code2 || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash2("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code2, message, headers) {
      message = message || http.STATUS_CODES[code2];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code2} ${http.STATUS_CODES[code2]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code2, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code2, message, headers);
      }
    }
  }
});

// node_modules/ws/wrapper.mjs
var import_stream, import_extension, import_permessage_deflate, import_receiver, import_sender, import_subprotocol, import_websocket, import_websocket_server;
var init_wrapper = __esm({
  "node_modules/ws/wrapper.mjs"() {
    import_stream = __toESM(require_stream(), 1);
    import_extension = __toESM(require_extension(), 1);
    import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
    import_receiver = __toESM(require_receiver(), 1);
    import_sender = __toESM(require_sender(), 1);
    import_subprotocol = __toESM(require_subprotocol(), 1);
    import_websocket = __toESM(require_websocket(), 1);
    import_websocket_server = __toESM(require_websocket_server(), 1);
  }
});

// node_modules/@page-scanner/cli/dist/bridge/tokens.js
import { timingSafeEqual } from "node:crypto";
function tokensMatch(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
var init_tokens = __esm({
  "node_modules/@page-scanner/cli/dist/bridge/tokens.js"() {
  }
});

// node_modules/@page-scanner/cli/dist/bridge/server.js
import { EventEmitter } from "node:events";
var DEFAULT_REQUEST_TIMEOUT_MS, HANDSHAKE_TIMEOUT_MS, CLOSE_REPLACED, CLOSE_BAD_TOKEN, CLOSE_BAD_PROTOCOL, CLOSE_BAD_ORIGIN, CLOSE_NO_HANDSHAKE, BridgeServer;
var init_server = __esm({
  "node_modules/@page-scanner/cli/dist/bridge/server.js"() {
    init_wrapper();
    init_errors();
    init_protocol();
    init_tokens();
    DEFAULT_REQUEST_TIMEOUT_MS = 12e4;
    HANDSHAKE_TIMEOUT_MS = 1e4;
    CLOSE_REPLACED = 4e3;
    CLOSE_BAD_TOKEN = 4001;
    CLOSE_BAD_PROTOCOL = 4002;
    CLOSE_BAD_ORIGIN = 4003;
    CLOSE_NO_HANDSHAKE = 4008;
    BridgeServer = class extends EventEmitter {
      /**
       * The port actually in use. It starts as the one that was asked for and
       * becomes the bound one once `start()` resolves, which is the difference
       * that matters when 0 was requested: `daemon.json` records this, and a
       * recorded 0 would send the extension nowhere.
       */
      port;
      token;
      log;
      requestTimeoutMs;
      now;
      browsers = /* @__PURE__ */ new Map();
      wss = null;
      constructor(options) {
        super();
        this.port = options.port;
        this.token = options.token;
        this.log = options.log ?? (() => {
        });
        this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
        this.now = options.now ?? Date.now;
      }
      /** Resolves with the port actually bound, which matters when 0 was asked for. */
      start() {
        return new Promise((resolve5, reject) => {
          const wss = new import_websocket_server.default({ host: "127.0.0.1", port: this.port });
          this.wss = wss;
          const onError = (error) => reject(error);
          wss.once("error", onError);
          wss.on("listening", () => {
            wss.off("error", onError);
            wss.on("error", (error) => this.log(`bridge socket error: ${error.message}`));
            const address = wss.address();
            const bound = typeof address === "object" && address !== null ? address.port : this.port;
            this.port = bound;
            this.log(`bridge listening on 127.0.0.1:${bound}`);
            resolve5(bound);
          });
          wss.on("connection", (socket, request) => this.accept(socket, request));
        });
      }
      accept(socket, request) {
        const origin = request.headers.origin ?? "";
        if (!origin.startsWith("chrome-extension://")) {
          this.log(`refused a connection from origin ${origin || "(none)"}`);
          socket.close(CLOSE_BAD_ORIGIN, "extension origins only");
          return;
        }
        let entry = null;
        const handshakeTimer = setTimeout(() => {
          if (!entry)
            socket.close(CLOSE_NO_HANDSHAKE, "no handshake");
        }, HANDSHAKE_TIMEOUT_MS);
        const refuse = (code2, reason, spoken) => {
          if (spoken !== void 0) {
            try {
              socket.send(JSON.stringify(helloReject(spoken)));
            } catch {
            }
          }
          socket.close(code2, reason);
        };
        socket.on("message", (data) => {
          const frame = parseInbound(String(data));
          if (!frame)
            return;
          if (isHelloFrame(frame)) {
            if (entry)
              return;
            if (frame.protocol !== BRIDGE_PROTOCOL_VERSION) {
              this.log(`refused protocol ${frame.protocol}, this server speaks ${BRIDGE_PROTOCOL_VERSION}`);
              clearTimeout(handshakeTimer);
              refuse(CLOSE_BAD_PROTOCOL, "protocol mismatch", `This Page Scanner speaks bridge protocol ${frame.protocol}, and page-scanner speaks ${BRIDGE_PROTOCOL_VERSION}. Update whichever is older.`);
              return;
            }
            if (!tokensMatch(frame.token, this.token)) {
              this.log("refused a connection with a bad token");
              clearTimeout(handshakeTimer);
              refuse(CLOSE_BAD_TOKEN, "bad token", `That token does not match this machine's pairing. Run \`${PAIR_COMMAND}\` and paste the token it prints.`);
              return;
            }
            clearTimeout(handshakeTimer);
            const previous = this.browsers.get(frame.browserId);
            if (previous) {
              this.rejectPending(previous, "The browser reconnected while this request was in flight.");
              previous.socket.close(CLOSE_REPLACED, "replaced");
            }
            entry = {
              socket,
              browserId: frame.browserId,
              label: frame.label || "Chrome",
              version: frame.extensionVersion,
              features: frame.features ?? [],
              since: this.now(),
              pending: /* @__PURE__ */ new Map(),
              nextId: 0
            };
            this.browsers.set(frame.browserId, entry);
            socket.send(JSON.stringify(helloAck()));
            this.log(`browser "${entry.label}" connected (${entry.browserId})`);
            this.emit("browser-connected", this.describe(entry));
            return;
          }
          if (!entry || isPingFrame(frame))
            return;
          const waiting = entry.pending.get(frame.id);
          if (!waiting)
            return;
          clearTimeout(waiting.timer);
          entry.pending.delete(frame.id);
          if (frame.type === "error") {
            waiting.reject(new PageScannerError("SCAN_FAILED", frame.message || "The scan failed."));
          } else {
            waiting.resolve(frame);
          }
        });
        socket.on("close", () => {
          clearTimeout(handshakeTimer);
          if (!entry)
            return;
          const current = this.browsers.get(entry.browserId);
          this.rejectPending(entry, "The browser disconnected before it answered.");
          if (current === entry) {
            this.browsers.delete(entry.browserId);
            this.log(`browser ${entry.browserId} disconnected`);
            this.emit("browser-disconnected", { browserId: entry.browserId, label: entry.label });
          }
        });
        socket.on("error", () => socket.close());
      }
      rejectPending(entry, message) {
        for (const [id, waiting] of entry.pending) {
          clearTimeout(waiting.timer);
          entry.pending.delete(id);
          waiting.reject(new PageScannerError("BROWSER_GONE", message));
        }
      }
      describe(entry) {
        return {
          browserId: entry.browserId,
          label: entry.label,
          extensionVersion: entry.version,
          connectedForMs: this.now() - entry.since,
          features: [...entry.features]
        };
      }
      /** Everything currently paired and connected. */
      listBrowsers() {
        return [...this.browsers.values()].map((entry) => this.describe(entry));
      }
      /**
       * Picks the browser a request meant.
       *
       * With one browser connected, naming it is optional: that is the common case
       * and making a caller look it up first would be noise. With several, the
       * caller has to choose, and the error says what the options are. A label
       * works as well as an id, because an id is a uuid nobody wants to type.
       */
      resolveBrowser(browserId) {
        const connected = this.listBrowsers();
        const listing = connected.map((b) => `${b.label} (${b.browserId})`).join(", ");
        if (browserId) {
          if (this.browsers.has(browserId))
            return browserId;
          const byLabel = connected.filter((b) => b.label.toLowerCase() === browserId.toLowerCase());
          const only = byLabel[0];
          if (byLabel.length === 1 && only)
            return only.browserId;
          if (byLabel.length > 1) {
            throw new PageScannerError("AMBIGUOUS_BROWSER", `More than one connected browser is called "${browserId}", so name one by id. Connected: ${listing}.`);
          }
          throw new PageScannerError("UNKNOWN_BROWSER", `No connected browser with id or label "${browserId}".` + (listing ? ` Connected: ${listing}.` : " None are connected."));
        }
        const first = connected[0];
        if (!first) {
          throw new PageScannerError("NO_BROWSER", "No browser is connected.", CONNECT_HINT);
        }
        if (connected.length > 1) {
          throw new PageScannerError("AMBIGUOUS_BROWSER", `More than one browser is connected, so name one with --browser. Connected: ${listing}.`);
        }
        return first.browserId;
      }
      /**
       * Waits for a browser to connect, which is what `--wait` is for: Chrome
       * retires the extension's service worker after about thirty seconds of
       * silence, and it dials back in when something wakes it.
       */
      waitForBrowser({ timeoutMs, browserId }) {
        try {
          return Promise.resolve(this.resolveBrowser(browserId));
        } catch (error) {
          if (!(error instanceof PageScannerError) || error.code !== "NO_BROWSER") {
            return Promise.reject(error);
          }
          if (timeoutMs <= 0)
            return Promise.reject(error);
        }
        return new Promise((resolve5, reject) => {
          const settle = (fn) => {
            clearTimeout(timer);
            this.off("browser-connected", onConnected);
            fn();
          };
          const onConnected = () => {
            try {
              const id = this.resolveBrowser(browserId);
              settle(() => resolve5(id));
            } catch {
            }
          };
          const timer = setTimeout(() => {
            settle(() => reject(new PageScannerError("NO_BROWSER", `No browser connected within ${Math.round(timeoutMs / 1e3)}s.`, CONNECT_HINT)));
          }, timeoutMs);
          this.on("browser-connected", onConnected);
        });
      }
      request(browserId, payload, timeoutMs) {
        const entry = this.browsers.get(browserId);
        if (!entry) {
          throw new PageScannerError("BROWSER_GONE", `Browser ${browserId} is no longer connected.`);
        }
        entry.nextId += 1;
        const id = `req-${entry.nextId}`;
        return new Promise((resolve5, reject) => {
          const timer = setTimeout(() => {
            entry.pending.delete(id);
            reject(new PageScannerError("TIMEOUT", `The browser did not answer in ${Math.round(timeoutMs / 1e3)}s.`));
          }, timeoutMs);
          entry.pending.set(id, { resolve: resolve5, reject, timer });
          try {
            entry.socket.send(JSON.stringify({ ...payload, id }));
          } catch (error) {
            clearTimeout(timer);
            entry.pending.delete(id);
            reject(new PageScannerError("BROWSER_GONE", error instanceof Error ? error.message : String(error)));
          }
        });
      }
      async listTabs(browserId, timeoutMs = this.requestTimeoutMs) {
        const answer = await this.request(browserId, { type: "list-tabs" }, timeoutMs);
        if (answer.type !== "tabs") {
          throw new PageScannerError("SCAN_FAILED", "The browser answered list-tabs with a scan.");
        }
        return answer;
      }
      async scan(browserId, request, timeoutMs = this.requestTimeoutMs) {
        const answer = await this.request(browserId, { type: "scan", ...request }, timeoutMs);
        if (answer.type !== "scan-result") {
          throw new PageScannerError("SCAN_FAILED", "The browser answered a scan with a tab list.");
        }
        return answer;
      }
      /**
       * A page's design as the browser measured it (#116). Refused
       * up front for an extension that did not say it can, which would otherwise
       * drop the request and leave the caller waiting out the timeout.
       */
      async extractDesign(browserId, request, timeoutMs = this.requestTimeoutMs) {
        this.requireFeature(browserId, "design-extract", "read a page's design");
        if (request.components)
          this.requireFeature(browserId, "design-components", "read components");
        const answer = await this.request(browserId, { type: "extract-design", ...request }, timeoutMs);
        if (answer.type !== "design-extract") {
          throw new PageScannerError("SCAN_FAILED", "The browser answered with something else.");
        }
        return answer;
      }
      /** The component catalog, cut from the captures a design extract stored (#143). */
      async designCatalog(browserId, request, timeoutMs = this.requestTimeoutMs) {
        this.requireFeature(browserId, "design-components", "draw a component catalog");
        const answer = await this.request(browserId, { type: "design-catalog", ...request }, timeoutMs);
        if (answer.type !== "design-catalog") {
          throw new PageScannerError("SCAN_FAILED", "The browser answered with something else.");
        }
        return answer;
      }
      /**
       * Refuses up front a request an extension did not say it can answer, which
       * would otherwise drop it and leave the caller waiting out the timeout.
       */
      requireFeature(browserId, feature, what) {
        const entry = this.browsers.get(browserId);
        if (entry && !entry.features.includes(feature)) {
          throw new PageScannerError("SCAN_FAILED", `The Page Scanner in "${entry.label}" (${entry.version}) cannot ${what}.`, "Update the extension (chrome://extensions, then Update), and try again.");
        }
      }
      async close() {
        for (const entry of this.browsers.values()) {
          this.rejectPending(entry, "The bridge shut down before the browser answered.");
          entry.socket.close(1001, "server shutting down");
        }
        this.browsers.clear();
        const wss = this.wss;
        this.wss = null;
        if (!wss)
          return;
        await new Promise((resolve5) => wss.close(() => resolve5()));
      }
    };
  }
});

// node_modules/@page-scanner/cli/dist/daemon/rpc-server.js
import { createServer } from "node:http";
function cleanupKinds(value) {
  if (!Array.isArray(value) || !value.every((kind) => CLEANUP_KINDS.includes(kind))) {
    throw new PageScannerError("BAD_REQUEST", `hide must be a list of ${CLEANUP_KINDS.join(", ")}.`);
  }
  return CLEANUP_KINDS.filter((kind) => value.includes(kind));
}
function readBody(request) {
  return new Promise((resolve5, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk2) => {
      size += chunk2.length;
      if (size > MAX_BODY_BYTES) {
        reject(new PageScannerError("BAD_REQUEST", "Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk2);
    });
    request.on("end", () => resolve5(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
function send(response, status2, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status2, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function optionalString(params, key) {
  const value = params[key];
  if (value === void 0)
    return void 0;
  if (typeof value !== "string" || value.length === 0) {
    throw new PageScannerError("BAD_REQUEST", `${key} must be a non-empty string.`);
  }
  return value;
}
function optionalInteger2(params, key) {
  const value = params[key];
  if (value === void 0)
    return void 0;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PageScannerError("BAD_REQUEST", `${key} must be an integer.`);
  }
  return value;
}
function timeoutFrom(params, fallback) {
  const value = params.timeoutMs;
  if (value === void 0)
    return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PageScannerError("BAD_REQUEST", "timeoutMs must be a non-negative number.");
  }
  return value;
}
function oneOf(params, key, allowed, fallback) {
  const value = params[key];
  if (value === void 0)
    return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new PageScannerError("BAD_REQUEST", `${key} must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)}).`);
  }
  return value;
}
async function dispatch(method, params, options) {
  const { bridge } = options;
  switch (method) {
    case "health":
      return {
        ok: true,
        version: CLI_VERSION,
        ...cliBuild() !== void 0 ? { build: cliBuild() } : {},
        pid: process.pid,
        bridgePort: bridge.port,
        browsers: bridge.listBrowsers().length
      };
    case "listBrowsers":
      return { browsers: bridge.listBrowsers() };
    case "waitForBrowser": {
      const browserId = await bridge.waitForBrowser({
        timeoutMs: timeoutFrom(params, 3e4),
        browserId: optionalString(params, "browserId")
      });
      const found = bridge.listBrowsers().find((b) => b.browserId === browserId);
      return { browserId, label: found?.label ?? "" };
    }
    case "listTabs": {
      const browserId = optionalString(params, "browserId");
      const waitMs = timeoutFrom(params, 0);
      const resolved = waitMs > 0 ? await bridge.waitForBrowser({ timeoutMs: waitMs, browserId }) : bridge.resolveBrowser(browserId);
      const answer = await bridge.listTabs(resolved);
      const found = bridge.listBrowsers().find((b) => b.browserId === resolved);
      return {
        browserId: resolved,
        label: found?.label ?? "",
        windows: answer.windows,
        tabs: answer.tabs
      };
    }
    case "scan": {
      const browserId = optionalString(params, "browserId");
      const waitMs = timeoutFrom(params, 0);
      const resolved = waitMs > 0 ? await bridge.waitForBrowser({ timeoutMs: waitMs, browserId }) : bridge.resolveBrowser(browserId);
      const url = optionalString(params, "url");
      const tabId = optionalInteger2(params, "tabId");
      if (url === void 0 === (tabId === void 0)) {
        throw new PageScannerError("BAD_REQUEST", "Give exactly one of url and tabId.");
      }
      const quality = params.quality;
      if (quality !== void 0 && (typeof quality !== "number" || !(quality > 0) || quality > 1)) {
        throw new PageScannerError("BAD_REQUEST", "quality must be a number in (0, 1].");
      }
      const answer = await bridge.scan(resolved, {
        ...url !== void 0 ? { url } : {},
        ...tabId !== void 0 ? { tabId } : {},
        ...optionalInteger2(params, "windowId") !== void 0 ? { windowId: optionalInteger2(params, "windowId") } : {},
        format: oneOf(params, "format", EXPORT_FORMAT_IDS, "pdf"),
        pageSize: oneOf(params, "pageSize", PAGE_SIZE_IDS, DEFAULT_PAGE_SIZE),
        ...quality !== void 0 ? { quality } : {},
        ...params.videoHandling !== void 0 ? {
          videoHandling: oneOf(params, "videoHandling", VIDEO_HANDLINGS, "frame")
        } : {},
        ...params.colorScheme !== void 0 ? {
          colorScheme: oneOf(params, "colorScheme", COLOR_SCHEME_PREFERENCES, "auto")
        } : {},
        ...params.captureWidth !== void 0 ? {
          captureWidth: oneOf(params, "captureWidth", CAPTURE_WIDTHS, "window")
        } : {},
        ...params.openEditor !== void 0 ? { openEditor: params.openEditor === true } : {},
        ...params.structured !== void 0 ? {
          structured: oneOf(params, "structured", STRUCTURED_MODES, "alongside")
        } : {},
        ...params.hide !== void 0 ? { hide: cleanupKinds(params.hide) } : {}
      }, timeoutFrom({ timeoutMs: params.scanTimeoutMs }, 12e4));
      return {
        browserId: resolved,
        width: answer.width,
        height: answer.height,
        mode: answer.mode,
        fileName: answer.fileName,
        truncated: answer.truncated ?? null,
        bytesBase64: answer.bytesBase64,
        ...answer.structured ? { structured: answer.structured } : {},
        ...answer.hidden ? { hidden: answer.hidden } : {}
      };
    }
    case "extractDesign": {
      const browserId = optionalString(params, "browserId");
      const waitMs = timeoutFrom(params, 0);
      const resolved = waitMs > 0 ? await bridge.waitForBrowser({ timeoutMs: waitMs, browserId }) : bridge.resolveBrowser(browserId);
      const url = optionalString(params, "url");
      const tabId = optionalInteger2(params, "tabId");
      if (url === void 0 === (tabId === void 0)) {
        throw new PageScannerError("BAD_REQUEST", "Give exactly one of url and tabId.");
      }
      const windowId = optionalInteger2(params, "windowId");
      const links = params.links === true;
      const components = params.components === true;
      const answer = await bridge.extractDesign(resolved, {
        ...url !== void 0 ? { url } : {},
        ...tabId !== void 0 ? { tabId } : {},
        ...windowId !== void 0 ? { windowId } : {},
        ...links ? { links } : {},
        ...components ? { components } : {}
      }, timeoutFrom({ timeoutMs: params.scanTimeoutMs }, 12e4));
      return {
        browserId: resolved,
        extract: answer.extract,
        ...answer.links ? { links: answer.links } : {},
        ...answer.components ? { components: answer.components } : {}
      };
    }
    case "designCatalog": {
      const browserId = optionalString(params, "browserId");
      const resolved = bridge.resolveBrowser(browserId);
      const title = optionalString(params, "title") ?? "Components";
      if (!Array.isArray(params.sections)) {
        throw new PageScannerError("BAD_REQUEST", "A catalog needs its sections.");
      }
      const answer = await bridge.designCatalog(resolved, { title, sections: params.sections }, timeoutFrom({ timeoutMs: params.scanTimeoutMs }, 12e4));
      return { browserId: resolved, bytesBase64: answer.bytesBase64 };
    }
    case "shutdown":
      return { ok: true };
    default:
      throw new PageScannerError("BAD_REQUEST", `Unknown method ${JSON.stringify(method)}.`);
  }
}
function startRpcServer(options) {
  const server = createServer((request, response) => {
    void handle(request, response, options, server);
  });
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  return new Promise((resolve5, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(options.port ?? 0, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve5({
        port,
        close: () => new Promise((done) => {
          server.closeAllConnections();
          server.close(() => done());
        })
      });
    });
  });
}
async function handle(request, response, options, server) {
  const unauthorized = {
    ok: false,
    error: { code: "BAD_REQUEST", message: "Unauthorized." }
  };
  const header = request.headers.authorization ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!tokensMatch(presented, options.secret)) {
    send(response, 401, unauthorized);
    return;
  }
  if (request.method !== "POST" || (request.url ?? "") !== "/rpc") {
    send(response, 404, {
      ok: false,
      error: { code: "BAD_REQUEST", message: "POST /rpc is the only route." }
    });
    return;
  }
  options.onActivity?.();
  let method = "";
  try {
    const raw = await readBody(request);
    const body = asRecord(JSON.parse(raw || "{}"));
    if (typeof body.method !== "string" || body.method.length === 0) {
      throw new PageScannerError("BAD_REQUEST", "method is required.");
    }
    method = body.method;
    const result = await dispatch(method, asRecord(body.params), options);
    send(response, 200, { ok: true, result });
  } catch (error) {
    const failure = toPageScannerError(error);
    send(response, 200, {
      ok: false,
      error: {
        code: failure.code,
        message: failure.message,
        ...failure.hint !== void 0 ? { hint: failure.hint } : {}
      }
    });
  }
  if (method === "shutdown") {
    server.closeIdleConnections();
    options.onShutdown();
  }
}
var MAX_BODY_BYTES;
var init_rpc_server = __esm({
  "node_modules/@page-scanner/cli/dist/daemon/rpc-server.js"() {
    init_errors();
    init_errors();
    init_protocol();
    init_version();
    init_tokens();
    MAX_BODY_BYTES = 1e6;
  }
});

// node_modules/@page-scanner/cli/dist/daemon/run.js
var run_exports = {};
__export(run_exports, {
  DEFAULT_IDLE_MINUTES: () => DEFAULT_IDLE_MINUTES,
  runDaemon: () => runDaemon
});
import { randomBytes as randomBytes2 } from "node:crypto";
function idleMinutesFrom(explicit) {
  if (explicit !== void 0)
    return explicit;
  const fromEnv = process.env.PAGE_SCANNER_IDLE_MINUTES;
  if (fromEnv === void 0 || fromEnv === "")
    return DEFAULT_IDLE_MINUTES;
  const parsed = Number(fromEnv);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_IDLE_MINUTES;
}
async function runDaemon(options = {}) {
  const log = options.log ?? ((message) => process.stderr.write(`${message}
`));
  const handleSignals = options.handleSignals ?? true;
  const existing = readDaemonState();
  if (existing) {
    log(`page-scanner is already running (pid ${existing.pid}, rpc port ${existing.rpcPort}).`);
    return;
  }
  const config = readConfig();
  if (!config.token) {
    throw new PageScannerError("NOT_PAIRED", "There is no pairing on this machine, so the bridge has nothing to check against.", `Run \`${INSTALL_COMMAND}\` first.`);
  }
  const bridge = new BridgeServer({ port: config.port, token: config.token, log });
  try {
    await bridge.start();
  } catch (error) {
    const code2 = error.code;
    if (code2 === "EADDRINUSE") {
      throw new PageScannerError("PORT_IN_USE", `Port ${config.port} is already in use, and no page-scanner daemon is registered on it.`, `An older page-scanner-mcp 0.1 holds this port when it is running; stop it, or pick another port with \`${PAIR_COMMAND} --port <n>\` and re-pair the browser.`);
    }
    throw new PageScannerError("DAEMON_FAILED", `Could not listen on 127.0.0.1:${config.port}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const secret = randomBytes2(32).toString("base64url");
  let lastActivity = Date.now();
  let stopping = false;
  let finish = () => {
  };
  const stopped = new Promise((resolve5) => {
    finish = resolve5;
  });
  let rpc = null;
  let idleTimer = null;
  const shutdown = async () => {
    if (idleTimer)
      clearInterval(idleTimer);
    if (handleSignals) {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
    if (rpc)
      await rpc.close();
    await bridge.close();
    clearDaemonState();
    log("page-scanner daemon stopped.");
    finish();
  };
  const stop = () => {
    if (stopping)
      return;
    stopping = true;
    void shutdown();
  };
  rpc = await startRpcServer({
    bridge,
    secret,
    onShutdown: stop,
    onActivity: () => {
      lastActivity = Date.now();
    }
  });
  writeDaemonState({
    pid: process.pid,
    rpcPort: rpc.port,
    secret,
    bridgePort: bridge.port,
    version: CLI_VERSION,
    startedAt: Date.now()
  });
  options.onListening?.({ bridgePort: bridge.port, rpcPort: rpc.port });
  log(`page-scanner daemon ${CLI_VERSION} ready (pid ${process.pid}, rpc port ${rpc.port}).`);
  const idleMinutes = idleMinutesFrom(options.idleMinutes);
  idleTimer = idleMinutes > 0 ? setInterval(() => {
    if (bridge.listBrowsers().length > 0) {
      lastActivity = Date.now();
      return;
    }
    if (Date.now() - lastActivity >= idleMinutes * 6e4) {
      log(`idle for ${idleMinutes} minutes with nothing connected, stopping.`);
      stop();
    }
  }, IDLE_CHECK_INTERVAL_MS) : null;
  idleTimer?.unref();
  if (handleSignals) {
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  }
  await stopped;
}
var DEFAULT_IDLE_MINUTES, IDLE_CHECK_INTERVAL_MS;
var init_run = __esm({
  "node_modules/@page-scanner/cli/dist/daemon/run.js"() {
    init_config();
    init_errors();
    init_server();
    init_version();
    init_rpc_server();
    init_state();
    DEFAULT_IDLE_MINUTES = 15;
    IDLE_CHECK_INTERVAL_MS = 3e4;
  }
});

// node_modules/@page-scanner/cli/dist/crawl.js
var DEFAULT_CRAWL_PAGES = 10;
var MAX_CRAWL_PAGES = 50;
var DEFAULT_CRAWL_DEPTH = 2;
var MAX_CRAWL_DEPTH = 5;
var SIBLINGS_FOR_TEMPLATE = 3;
var UNSAFE_SEGMENT = /^(log-?out|sign-?out|log-?off|delete|remove|unsubscribe|deactivate|cancel|destroy)$/i;
var FILE = /\.(pdf|zip|gz|tgz|tar|rar|7z|dmg|exe|msi|pkg|deb|rpm|png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|mp4|webm|mov|m4v|mp3|wav|ogg|flac|xml|json|rss|atom|txt|csv|ics|css|js|mjs|map|woff2?|ttf|otf)$/i;
function placeholder(segment) {
  if (/^\d+$/.test(segment))
    return ":n";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment))
    return ":id";
  if (/^[0-9a-f]{12,}$/i.test(segment) && /\d/.test(segment))
    return ":id";
  if (/^\d{4}(-\d{1,2}){0,2}$/.test(segment))
    return ":date";
  return null;
}
function segmentsOf(url) {
  return url.pathname.split("/").filter(Boolean);
}
var SiblingIndex = class {
  #children = /* @__PURE__ */ new Map();
  add(address) {
    const segments = segmentsOf(new URL(address));
    if (segments.length === 0)
      return;
    const parent = segments.slice(0, -1).map((s) => placeholder(s) ?? s).join("/");
    let children = this.#children.get(parent);
    if (!children)
      this.#children.set(parent, children = /* @__PURE__ */ new Set());
    children.add(segments.at(-1));
  }
  count(parent) {
    return this.#children.get(parent)?.size ?? 0;
  }
  /**
   * Whether any address seen is below this one: `/kr/sales/` with
   * `/kr/sales/pipeline/`, or `/docs.html` with `/docs/intro.html`.
   */
  hasChildren(address) {
    const segments = segmentsOf(new URL(address)).map((s) => placeholder(s) ?? s);
    if (segments.length === 0)
      return false;
    segments[segments.length - 1] = segments.at(-1).replace(/\.(html?|php|aspx?|jsp)$/i, "");
    return this.#children.has(segments.join("/"));
  }
};
function templateOf(address, siblings) {
  const url = new URL(address);
  const segments = segmentsOf(url).map((segment) => placeholder(segment) ?? segment);
  if (segments.length > 0) {
    const parent = segments.slice(0, -1).join("/");
    if (siblings.count(parent) >= SIBLINGS_FOR_TEMPLATE && !siblings.hasChildren(address)) {
      segments[segments.length - 1] = "*";
    }
  }
  return `${url.origin}/${segments.join("/")}`;
}
function decoded(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
function refusal(link, origin) {
  let url;
  try {
    url = new URL(link);
  } catch {
    return "not a page";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return "not a page";
  if (url.origin !== origin)
    return "origin";
  const segments = segmentsOf(url);
  if (segments.some((segment) => decoded(segment).replace(/_/g, "-").split(/[.~+]/).some((word) => UNSAFE_SEGMENT.test(word)))) {
    return "unsafe";
  }
  if (FILE.test(url.pathname))
    return "file";
  return null;
}
function landing(address) {
  try {
    return normalize(address);
  } catch {
    return "about:blank";
  }
}
function normalize(link) {
  const url = new URL(link);
  url.hash = "";
  return url.href;
}
var ALLOW_ALL = { allows: () => true };
function ruleFor(allow, path) {
  const anchored = path.endsWith("$");
  const body = (anchored ? path.slice(0, -1) : path).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return { allow, pattern: new RegExp(`^${body}${anchored ? "$" : ""}`), length: path.length };
}
function parseRobots(text, agent = "PageScanner") {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line2 = raw.replace(/#.*$/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line2);
    if (!match)
      continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (!lastWasAgent || !current)
        groups.push(current = { agents: [], rules: [] });
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current)
      continue;
    if (field === "disallow" && value)
      current.rules.push(ruleFor(false, value));
    if (field === "allow" && value)
      current.rules.push(ruleFor(true, value));
  }
  const name = agent.toLowerCase();
  const group = groups.find((g) => g.agents.some((a) => a !== "*" && name.includes(a))) ?? groups.find((g) => g.agents.includes("*"));
  if (!group)
    return ALLOW_ALL;
  return {
    allows(path) {
      let best = null;
      for (const rule of group.rules) {
        if (!rule.pattern.test(path))
          continue;
        if (!best || rule.length > best.length || rule.length === best.length && rule.allow) {
          best = rule;
        }
      }
      return best ? best.allow : true;
    }
  };
}
async function fetchRobots(origin, fetcher = fetch) {
  try {
    const response = await fetcher(`${origin}/robots.txt`, {
      headers: { "user-agent": "PageScanner" },
      signal: AbortSignal.timeout(5e3),
      redirect: "follow"
    });
    if (response.status >= 400 && response.status < 500)
      return { rules: ALLOW_ALL, status: "none" };
    if (!response.ok)
      return { rules: ALLOW_ALL, status: "unreachable" };
    return { rules: parseRobots(await response.text()), status: "read" };
  } catch {
    return { rules: ALLOW_ALL, status: "unreachable" };
  }
}
async function crawl(start, read2, options = {}) {
  const maxPages = options.maxPages ?? DEFAULT_CRAWL_PAGES;
  const maxDepth = options.maxDepth ?? DEFAULT_CRAWL_DEPTH;
  let robots = typeof options.robots === "object" ? options.robots : ALLOW_ALL;
  let origin = new URL(start).origin;
  const siblings = new SiblingIndex();
  const queued = /* @__PURE__ */ new Set();
  const taken = [];
  const queue = [];
  const result = {
    pages: [],
    skipped: {
      template: 0,
      robots: 0,
      unsafe: 0,
      file: 0,
      depth: 0,
      limit: 0,
      elsewhere: 0,
      duplicate: 0
    }
  };
  const isTaken = (address, self) => {
    const template = templateOf(address, siblings);
    return taken.some((url) => url !== self && (url === address || templateOf(url, siblings) === template));
  };
  const first = normalize(start);
  queue.push({ url: first, depth: 0 });
  queued.add(first);
  siblings.add(first);
  while (queue.length > 0) {
    const next = queue.shift();
    if (isTaken(next.url)) {
      result.skipped.template += 1;
      continue;
    }
    if (next.depth > 0 && !robots.allows(new URL(next.url).pathname + new URL(next.url).search)) {
      result.skipped.robots += 1;
      continue;
    }
    if (result.pages.length >= maxPages) {
      result.skipped.limit += 1 + queue.length;
      break;
    }
    taken.push(next.url);
    let page;
    let links = [];
    try {
      const answer = await read2(next.url);
      page = { url: next.url, depth: next.depth, ok: true, value: answer.value };
      links = answer.links;
      const landed = answer.landed !== void 0 ? landing(answer.landed) : next.url;
      if (landed !== next.url)
        page.landed = landed;
      if (next.depth === 0) {
        origin = new URL(landed).origin;
        if (typeof options.robots === "function")
          robots = await options.robots(origin);
      } else if (new URL(landed).origin !== origin) {
        page = { ...page, ok: false, left: "elsewhere" };
        delete page.value;
        result.skipped.elsewhere += 1;
      } else if (landed !== next.url && isTaken(landed, next.url)) {
        page = { ...page, ok: false, left: "duplicate" };
        delete page.value;
        result.skipped.duplicate += 1;
      }
      if (page.left)
        links = [];
      else if (landed !== next.url) {
        taken.push(landed);
        queued.add(landed);
        siblings.add(landed);
      }
    } catch (error) {
      if (options.isFatal?.(error))
        throw error;
      page = {
        url: next.url,
        depth: next.depth,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        error
      };
    }
    result.pages.push(page);
    options.onPage?.(page);
    for (const raw of links) {
      const why = refusal(raw, origin);
      if (why === "unsafe")
        result.skipped.unsafe += 1;
      if (why === "file")
        result.skipped.file += 1;
      if (why)
        continue;
      const link = normalize(raw);
      siblings.add(link);
      if (queued.has(link))
        continue;
      if (next.depth + 1 > maxDepth) {
        result.skipped.depth += 1;
        continue;
      }
      queued.add(link);
      queue.push({ url: link, depth: next.depth + 1 });
    }
  }
  return result;
}

// node_modules/@page-scanner/cli/dist/cli/args.js
init_errors();
init_protocol();
import { parseArgs as parseNodeArgs } from "node:util";
var COMMANDS = [
  "install",
  "uninstall",
  "pair",
  "status",
  "browsers",
  "tabs",
  "scan",
  "diff",
  "verify",
  "design",
  "serve",
  "stop",
  "help",
  "version"
];
var PAIR_WAIT_SECONDS = 120;
var TABS_WAIT_SECONDS = 30;
var SCAN_WAIT_SECONDS = 30;
var SCAN_TIMEOUT_SECONDS = 120;
var USAGE = `page-scanner - capture a whole web page from the command line,
through the Page Scanner Chrome extension.

Usage:
  page-scanner install  [--extension-id <id>]... [--browser-dir <dir>]...
                        [--node <path>] [--json]
  page-scanner uninstall [--browser-dir <dir>]... [--json]
  page-scanner pair     [--port <n>] [--rotate] [--wait <s>=${PAIR_WAIT_SECONDS}] [--no-wait]
                        [--json]
  page-scanner status   [--json]
  page-scanner browsers [--json]
  page-scanner tabs     [--browser <id|label>] [--wait <s>=${TABS_WAIT_SECONDS}] [--json]
  page-scanner scan     (--url <u>... | --urls <file|-> | --tab <id>)
                        [--window <id>] [--name <template>]
                        [--markdown beside|only] [--hide <kinds>|all|none]
                        [--browser <id|label>] [--format pdf|png|jpeg=pdf]
                        [--page-size auto|a4|letter=a4] [--quality <0-1>]
                        [--video frame|blank] [--scheme auto|light|dark]
                        [--page-width window|a4|letter] [--open-editor]
                        [--out <file|dir>] [--wait <s>=${SCAN_WAIT_SECONDS}]
                        [--timeout <s>=${SCAN_TIMEOUT_SECONDS}]
                        [--json]
  page-scanner diff     <old> <new> [--out <file>] [--json]
  page-scanner verify   <file> [--record <file.integrity.json>] [--json]
  page-scanner design   (--url <u>... | --urls <file|-> | --tab <id> |
                         --crawl <u> [--max-pages <n>=10] [--depth <n>=2])
                        [--components] [--window <id>] [--out <dir>]
                        [--min-uses <n>=2] [--browser <id|label>]
                        [--wait <s>=${SCAN_WAIT_SECONDS}] [--timeout <s>=${SCAN_TIMEOUT_SECONDS}] [--json]
  page-scanner serve    [--daemon] [--idle <min>]
  page-scanner stop     [--json]
  page-scanner --version | --help          (-v and -h also work)

Commands:
  install   Set up the helper Chrome starts to connect the extension, in
            every Chromium browser here. Then press Connect in the settings.
  uninstall Take the helper out of every browser again.
  pair      Write a port and token to paste into the settings instead.
  status    Say whether there is a pairing, a daemon and a browser.
  browsers  List the browsers connected right now.
  tabs      List one browser's windows and tabs.
  scan      Capture a page, or a list of them, and write each to a file.
  diff      Say what changed between two captures of a page.
  verify    Check a file against the integrity record exported beside it.
  design    Read a site's design tokens from one page or several, with an
            audit and a contrast check.
  serve     Run the bridge in this terminal, or start it in the background.
  stop      Stop the background bridge.

install needs no port and no token: Chrome starts the helper for the
Page Scanner extension and nothing else, and the helper reads the pairing
from this machine. An unpacked build loaded in developer mode is found by
itself; --extension-id adds an id by hand; --browser-dir sets up only
that user data directory, for a profile started with --user-data-dir.
--node names the Node the helper runs on, by a path that survives an
upgrade (/opt/homebrew/bin/node rather than the version it points at);
the default is the Node running install.
pair is the older way, for a machine where the helper cannot be installed.

--scheme picks which of a page's two themes to capture. The default, auto,
is the one the browser is set to, in the PDF as well as the preview: Chrome
prints every page light unless it is told otherwise.

--page-width lays the page out at the width of a sheet before capturing it,
the way a narrow window would, so the PDF prints at 1:1 instead of being
scaled down. A 1280 px window on A4 is scaled to 55 %, which puts 16 px
body text at 6.5 pt; --page-width a4 puts it at 12.

--url can be given more than once, and --urls reads a file of addresses,
one to a line (# starts a comment, - reads standard input). A list is
scanned one page at a time into --out, which is then a directory; a page
that fails is reported and the next one scanned, and the exit code is 1
if any failed. Schedule it with cron, launchd or Task Scheduler.

--name sets the file name inside --out: {n} (the page's place in the
list), {host}, {name} (the name the browser suggests), {date} and {time}
(when the run started), {ext}. A / makes a subdirectory. Without it, a
file takes the browser's name, with -2, -3 when two pages share one.

--hide hides clutter before the capture and puts it back after: a comma
list of ads, consent, chat and overlays, or all, or none. Without it the
extension's own settings decide. The --json result counts what was hidden.

--markdown writes the page's text as Markdown: beside puts a .md next to
the file, only writes the .md alone. The headings, title and language come
back in --json as "page".

diff compares two Markdown files (from --markdown) a passage at a time,
printing what diff -u prints, or two PNGs pixel by pixel, writing the newer
one with the changed regions outlined (--out, or <new>.diff.png). A PDF is
compared by the .md beside it. It exits 0 when nothing changed and 1 when
something did, the way diff does.

verify checks a file's SHA-256 against the record the extension wrote
beside it (<file>.integrity.json unless --record names another) and, when
the record is signed, the signature. It exits 0 when both hold and 1 when
either does not. It says nothing about the time, which is the capturing
computer's clock.

--browser takes a browserId or a label, matched without regard to case, and
is needed only when more than one browser is connected. --wait 0 means do
not wait at all. --json prints one JSON document on stdout, on success and
on failure alike.

Exit codes:
  0  success
  1  the browser was reached and the work failed
  2  the arguments were wrong
  3  no usable browser: none connected, several connected, or the one
     named is not
  4  not paired: run \`page-scanner install\`
  5  the daemon would not start
`;
function badRequest(message, hint) {
  return new PageScannerError("BAD_REQUEST", message, hint);
}
function quote(raw) {
  return JSON.stringify(raw);
}
function requireNumber(flag, raw, expectation, accept) {
  const value = raw.trim() === "" ? Number.NaN : Number(raw);
  if (!Number.isFinite(value) || !accept(value)) {
    throw badRequest(`${flag} must be ${expectation} (got ${quote(raw)}).`);
  }
  return value;
}
var DECIMAL_INTEGER = /^[+-]?\d+$/;
function requireInteger(flag, raw) {
  if (!DECIMAL_INTEGER.test(raw.trim())) {
    throw badRequest(`${flag} must be an integer (got ${quote(raw)}).`);
  }
  return requireNumber(flag, raw, "an integer", Number.isSafeInteger);
}
function requireSeconds(flag, raw) {
  return requireNumber(flag, raw, "a number of seconds, 0 or more", (value) => value >= 0);
}
function requireEnum(flag, raw, allowed) {
  const match = allowed.find((candidate) => candidate === raw);
  if (match === void 0) {
    throw badRequest(`${flag} must be one of ${allowed.join(", ")} (got ${quote(raw)}).`);
  }
  return match;
}
function requireHide(raw) {
  const words = raw.split(",").map((word) => word.trim()).filter(Boolean);
  if (words.length === 1 && words[0] === "all")
    return [...CLEANUP_KINDS];
  if (words.length === 1 && words[0] === "none")
    return [];
  const unknown = words.filter((word) => !CLEANUP_KINDS.includes(word));
  if (words.length === 0 || unknown.length > 0) {
    throw badRequest(`--hide must be all, none, or a comma list of ${CLEANUP_KINDS.join(", ")} (got ${quote(raw)}).`);
  }
  return CLEANUP_KINDS.filter((kind) => words.includes(kind));
}
function requireText(flag, raw) {
  if (raw.trim() === "")
    throw badRequest(`${flag} needs a value.`);
  return raw;
}
function optionalInteger(flag, raw) {
  return raw === void 0 ? void 0 : requireInteger(flag, raw);
}
function optionalText(flag, raw) {
  return raw === void 0 ? void 0 : requireText(flag, raw);
}
function readOptions(read2) {
  try {
    return read2();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw badRequest(message, "Run `page-scanner --help` for the commands and their options.");
  }
}
function wantsHelp(values) {
  return values.help === true;
}
function parseInstall(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      "extension-id": { type: "string", multiple: true },
      "browser-dir": { type: "string", multiple: true },
      node: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return {
    command: "install",
    extensionIds: (values["extension-id"] ?? []).map((id) => requireText("--extension-id", id)),
    browserDirs: (values["browser-dir"] ?? []).map((dir) => requireText("--browser-dir", dir)),
    ...values.node !== void 0 ? { node: requireText("--node", values.node) } : {},
    json: values.json === true
  };
}
function parseUninstall(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      "browser-dir": { type: "string", multiple: true },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return {
    command: "uninstall",
    browserDirs: (values["browser-dir"] ?? []).map((dir) => requireText("--browser-dir", dir)),
    json: values.json === true
  };
}
function parseDesign(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      // Required while the extract was experimental (#116); still taken, and
      // ignored, so a script or an agent skill written then keeps working.
      experimental: { type: "boolean" },
      url: { type: "string", multiple: true },
      urls: { type: "string" },
      crawl: { type: "string" },
      "max-pages": { type: "string" },
      depth: { type: "string" },
      tab: { type: "string" },
      window: { type: "string" },
      browser: { type: "string" },
      out: { type: "string" },
      "min-uses": { type: "string" },
      components: { type: "boolean" },
      wait: { type: "string" },
      timeout: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  const urls = (values.url ?? []).map((url) => requireText("--url", url));
  const urlsFile = optionalText("--urls", values.urls);
  const tabId = optionalInteger("--tab", values.tab);
  const crawl2 = optionalText("--crawl", values.crawl);
  const byAddress = urls.length > 0 || urlsFile !== void 0;
  const ways = [byAddress, tabId !== void 0, crawl2 !== void 0].filter(Boolean).length;
  if (ways !== 1) {
    throw badRequest("design needs pages to read, one way: --url <address> (more than once for several), --urls <file>, --crawl <address> to follow its links, or --tab <id>.");
  }
  if (crawl2 === void 0 && (values["max-pages"] !== void 0 || values.depth !== void 0)) {
    throw badRequest("--max-pages and --depth go with --crawl.");
  }
  return {
    command: "design",
    urls,
    ...urlsFile !== void 0 ? { urlsFile } : {},
    ...crawl2 !== void 0 ? { crawl: crawl2 } : {},
    ...values["max-pages"] !== void 0 ? {
      maxPages: requireNumber("--max-pages", values["max-pages"], `a whole number from 1 to ${MAX_CRAWL_PAGES}`, (n) => Number.isInteger(n) && n >= 1 && n <= MAX_CRAWL_PAGES)
    } : {},
    ...values.depth !== void 0 ? {
      depth: requireNumber("--depth", values.depth, `a whole number from 0 to ${MAX_CRAWL_DEPTH}`, (n) => Number.isInteger(n) && n >= 0 && n <= MAX_CRAWL_DEPTH)
    } : {},
    ...tabId !== void 0 ? { tabId } : {},
    ...values.window !== void 0 ? { windowId: requireInteger("--window", values.window) } : {},
    ...values.browser !== void 0 ? { browser: requireText("--browser", values.browser) } : {},
    ...values.out !== void 0 ? { out: requireText("--out", values.out) } : {},
    ...values.components === true ? { components: true } : {},
    ...values["min-uses"] !== void 0 ? {
      minUses: requireNumber("--min-uses", values["min-uses"], "a whole number, 1 or more", (n) => Number.isInteger(n) && n >= 1)
    } : {},
    waitSeconds: values.wait === void 0 ? SCAN_WAIT_SECONDS : requireSeconds("--wait", values.wait),
    timeoutSeconds: values.timeout === void 0 ? SCAN_TIMEOUT_SECONDS : requireSeconds("--timeout", values.timeout),
    json: values.json === true
  };
}
function parsePair(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      port: { type: "string" },
      rotate: { type: "boolean" },
      wait: { type: "string" },
      "no-wait": { type: "boolean" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  const requested = values.wait === void 0 ? PAIR_WAIT_SECONDS : requireSeconds("--wait", values.wait);
  const waitSeconds = values["no-wait"] === true ? 0 : requested;
  return {
    command: "pair",
    port: values.port === void 0 ? void 0 : requireNumber(
      "--port",
      values.port,
      "an integer from 1 to 65535",
      // Port 0 would ask the kernel for any free port, which the browser
      // then has no way of learning: the pairing file is the only thing
      // that tells it where to dial.
      (value) => Number.isInteger(value) && value >= 1 && value <= 65535
    ),
    rotate: values.rotate === true,
    waitSeconds,
    json: values.json === true
  };
}
function parseStatus(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return { command: "status", json: values.json === true };
}
function parseBrowsers(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return { command: "browsers", json: values.json === true };
}
function parseTabs(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      browser: { type: "string" },
      wait: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return {
    command: "tabs",
    browser: optionalText("--browser", values.browser),
    waitSeconds: values.wait === void 0 ? TABS_WAIT_SECONDS : requireSeconds("--wait", values.wait),
    json: values.json === true
  };
}
function parseScan(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      url: { type: "string", multiple: true },
      urls: { type: "string" },
      name: { type: "string" },
      markdown: { type: "string" },
      hide: { type: "string" },
      tab: { type: "string" },
      window: { type: "string" },
      browser: { type: "string" },
      format: { type: "string" },
      "page-size": { type: "string" },
      quality: { type: "string" },
      video: { type: "string" },
      scheme: { type: "string" },
      "page-width": { type: "string" },
      "open-editor": { type: "boolean" },
      out: { type: "string" },
      wait: { type: "string" },
      timeout: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  const urls = (values.url ?? []).map((url) => requireText("--url", url));
  const urlsFile = optionalText("--urls", values.urls);
  if (urls.length === 0 && urlsFile === void 0 && values.tab === void 0) {
    throw badRequest("scan needs a page to capture: give --url <address>, --urls <file> or --tab <id>.", "Run `page-scanner tabs` to see the tabs that are open.");
  }
  if ((urls.length > 0 || urlsFile !== void 0) && values.tab !== void 0) {
    throw badRequest("scan takes --url or --urls, or --tab, not both.");
  }
  const batch = urls.length > 1 || urlsFile !== void 0;
  if (batch && values["open-editor"] === true) {
    throw badRequest("--open-editor opens a tab for each page, so it is not for a list.");
  }
  return {
    command: "scan",
    ...batch ? { urls, ...urlsFile !== void 0 ? { urlsFile } : {} } : { url: urls[0] },
    name: optionalText("--name", values.name),
    ...values.hide !== void 0 ? { hide: requireHide(values.hide) } : {},
    markdown: values.markdown === void 0 ? void 0 : requireEnum("--markdown", values.markdown, ["beside", "only"]),
    tabId: optionalInteger("--tab", values.tab),
    windowId: optionalInteger("--window", values.window),
    browser: optionalText("--browser", values.browser),
    format: values.format === void 0 ? "pdf" : requireEnum("--format", values.format, EXPORT_FORMAT_IDS),
    pageSize: values["page-size"] === void 0 ? DEFAULT_PAGE_SIZE : requireEnum("--page-size", values["page-size"], PAGE_SIZE_IDS),
    quality: values.quality === void 0 ? void 0 : requireNumber("--quality", values.quality, "a number greater than 0 and at most 1", (value) => value > 0 && value <= 1),
    videoHandling: values.video === void 0 ? void 0 : requireEnum("--video", values.video, VIDEO_HANDLINGS),
    colorScheme: values.scheme === void 0 ? void 0 : requireEnum("--scheme", values.scheme, COLOR_SCHEME_PREFERENCES),
    captureWidth: values["page-width"] === void 0 ? void 0 : requireEnum("--page-width", values["page-width"], CAPTURE_WIDTHS),
    openEditor: values["open-editor"] === true,
    out: optionalText("--out", values.out),
    waitSeconds: values.wait === void 0 ? SCAN_WAIT_SECONDS : requireSeconds("--wait", values.wait),
    timeoutSeconds: values.timeout === void 0 ? SCAN_TIMEOUT_SECONDS : requireSeconds("--timeout", values.timeout),
    json: values.json === true
  };
}
function parseDiff(argv) {
  const { values, positionals } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      out: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  const [older, newer, ...rest] = positionals;
  if (older === void 0 || newer === void 0 || rest.length > 0) {
    throw badRequest(`diff takes two captures, the older and the newer (got ${positionals.length}).`, "For example: page-scanner diff monday/pricing.md tuesday/pricing.md");
  }
  return {
    command: "diff",
    old: requireText("<old>", older),
    new: requireText("<new>", newer),
    out: optionalText("--out", values.out),
    json: values.json === true
  };
}
function parseVerify(argv) {
  const { values, positionals } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      record: { type: "string" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  const [file, ...rest] = positionals;
  if (file === void 0 || rest.length > 0) {
    throw badRequest(`verify takes one file (got ${positionals.length}).`, "For example: page-scanner verify terms.pdf");
  }
  return {
    command: "verify",
    file: requireText("<file>", file),
    record: optionalText("--record", values.record),
    json: values.json === true
  };
}
function parseServe(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      daemon: { type: "boolean" },
      idle: { type: "string" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return {
    command: "serve",
    daemon: values.daemon === true,
    idleMinutes: values.idle === void 0 ? void 0 : requireNumber("--idle", values.idle, "a number of minutes, 0 or more", (v) => v >= 0)
  };
}
function parseStop(argv) {
  const { values } = readOptions(() => parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" }
    }
  }));
  if (wantsHelp(values))
    return { command: "help" };
  return { command: "stop", json: values.json === true };
}
var COMMAND_FLAGS = /* @__PURE__ */ new Map([
  ["--help", "help"],
  ["-h", "help"],
  ["--version", "version"],
  ["-v", "version"]
]);
function isCommandName(value) {
  return COMMANDS.some((command2) => command2 === value);
}
var RUNNABLE_COMMANDS = COMMANDS.filter((command2) => command2 !== "help" && command2 !== "version").join(", ");
function parseArgs(argv) {
  const first = argv[0];
  if (first === void 0)
    return { command: "help" };
  const command2 = COMMAND_FLAGS.get(first) ?? (isCommandName(first) ? first : void 0);
  if (command2 === void 0) {
    throw first.startsWith("-") ? badRequest(`Unknown option ${quote(first)}. A command comes first: one of ${RUNNABLE_COMMANDS}.`) : badRequest(`Unknown command ${quote(first)}. Expected one of ${RUNNABLE_COMMANDS}.`);
  }
  const rest = argv.slice(1);
  switch (command2) {
    case "install":
      return parseInstall(rest);
    case "uninstall":
      return parseUninstall(rest);
    case "pair":
      return parsePair(rest);
    case "status":
      return parseStatus(rest);
    case "browsers":
      return parseBrowsers(rest);
    case "tabs":
      return parseTabs(rest);
    case "scan":
      return parseScan(rest);
    case "diff":
      return parseDiff(rest);
    case "verify":
      return parseVerify(rest);
    case "design":
      return parseDesign(rest);
    case "serve":
      return parseServe(rest);
    case "stop":
      return parseStop(rest);
    case "help":
      return { command: "help" };
    case "version":
      return { command: "version" };
  }
}

// node_modules/@page-scanner/cli/dist/cli/commands.js
import { accessSync as accessSync2, constants as constants2, readFileSync as readFileSync7 } from "node:fs";
import { isAbsolute as isAbsolute2, resolve as resolve4 } from "node:path";

// node_modules/@page-scanner/cli/dist/api.js
init_config();
init_errors();

// node_modules/@page-scanner/cli/dist/output.js
import { accessSync, constants, mkdirSync as mkdirSync2, statSync, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { basename, dirname as dirname2, join as join3, parse, resolve } from "node:path";

// node_modules/@page-scanner/cli/dist/daemon/self.js
init_errors();
import { existsSync } from "node:fs";
import { dirname, extname, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
function packageEntry(moduleUrl = import.meta.url) {
  let here;
  try {
    here = fileURLToPath(moduleUrl);
  } catch {
    return void 0;
  }
  const entry = join2(dirname(here), "..", `bin${extname(here)}`);
  return existsSync(entry) ? entry : void 0;
}
function selfCommand(argv = process.argv, execPath = process.execPath, findEntry = packageEntry) {
  const entry = findEntry();
  if (entry !== void 0)
    return { command: execPath, args: [entry] };
  const script = argv[1];
  if (script === void 0 || script === "") {
    throw new PageScannerError("DAEMON_FAILED", "page-scanner cannot work out how to restart itself: this process was started without a script path.", "Start the daemon yourself with `page-scanner serve`, or run the CLI from its installed `page-scanner` command.");
  }
  return { command: execPath, args: [script] };
}
function canSpawnSelf(versions = process.versions, hasParentPort = "parentPort" in process) {
  return versions.electron === void 0 || !hasParentPort;
}

// node_modules/@page-scanner/cli/dist/output.js
var TRAILING_SEPARATOR = /[\\/]$/;
var FILE_EXTENSION = /\.[a-z0-9]{2,5}$/i;
function resolveOutputPath(outputPath, suggestedName, cwd = process.cwd()) {
  if (!outputPath)
    return resolve(cwd, suggestedName);
  const target = resolve(cwd, outputPath);
  return outputNamesAFile(outputPath, cwd) ? target : join3(target, suggestedName);
}
function outputNamesAFile(outputPath, cwd = process.cwd()) {
  const target = resolve(cwd, outputPath);
  return !TRAILING_SEPARATOR.test(outputPath) && FILE_EXTENSION.test(target) && !isExistingDirectory(target);
}
function expandHome(path, home = homedir2()) {
  if (path === "~")
    return home;
  if (/^~[\\/]/.test(path))
    return join3(home, path.slice(2));
  return path;
}
function isExistingDirectory(candidate) {
  try {
    return statSync(candidate, { throwIfNoEntry: false })?.isDirectory() ?? false;
  } catch {
    return false;
  }
}
function withExtension(path, extension2) {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? path.slice(0, path.length - base.length + dot) : path;
  return `${stem}.${extension2}`;
}
function writeTextFile(target, text) {
  mkdirSync2(dirname2(target), { recursive: true });
  writeFileSync2(target, text, "utf8");
}
function writeScanFile(target, bytesBase64) {
  mkdirSync2(dirname2(target), { recursive: true });
  writeFileSync2(target, Buffer.from(bytesBase64, "base64"));
}

// node_modules/@page-scanner/cli/dist/batch.js
init_errors();
var MAX_BATCH_URLS = 1e3;
var NAME_FIELDS = ["n", "host", "name", "date", "time", "ext"];
var PLACEHOLDER = /\{([^{}]*)\}/g;
function readUrlList(text) {
  return text.split(/\r?\n/).map((line2) => line2.trim()).filter((line2) => line2 !== "" && !line2.startsWith("#"));
}
function checkNameTemplate(template) {
  if (template.trim() === "") {
    throw new PageScannerError("BAD_REQUEST", "--name needs a value.");
  }
  for (const [, field] of template.matchAll(PLACEHOLDER)) {
    if (!NAME_FIELDS.some((known) => known === field)) {
      throw new PageScannerError("BAD_REQUEST", `--name has an unknown placeholder {${field}}.`, `The placeholders are ${NAME_FIELDS.map((known) => `{${known}}`).join(", ")}.`);
    }
  }
  if (template.split(/[\\/]/).some((segment) => segment === "..")) {
    throw new PageScannerError("BAD_REQUEST", '--name may not climb out of the output directory with "..".');
  }
}
var UNSAFE = /[<>:"|?*\u0000-\u001f]/g;
function pad(value, width) {
  return String(value).padStart(width, "0");
}
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/\./g, "-") || "page";
  } catch {
    return "page";
  }
}
function fillNameTemplate(template, context) {
  const dot = context.suggested.lastIndexOf(".");
  const ext = dot > 0 ? context.suggested.slice(dot + 1) : "";
  const at = context.startedAt;
  const values = {
    n: pad(context.index, String(context.count).length),
    host: hostOf(context.url),
    name: dot > 0 ? context.suggested.slice(0, dot) : context.suggested,
    date: `${at.getFullYear()}${pad(at.getMonth() + 1, 2)}${pad(at.getDate(), 2)}`,
    time: `${pad(at.getHours(), 2)}${pad(at.getMinutes(), 2)}`,
    ext
  };
  const filled = template.replace(PLACEHOLDER, (_, field) => values[field].replace(/[\\/]/g, "-"));
  const named = template.includes("{ext}") || !ext ? filled : `${filled}.${ext}`;
  return named.split(/[\\/]/).map((segment) => segment.replace(UNSAFE, "-").trim()).filter((segment) => segment !== "" && segment !== "." && segment !== "..").join("/");
}
function uniqueName(name, taken) {
  const dot = name.lastIndexOf(".");
  const slash = name.lastIndexOf("/");
  const cut = dot > slash + 1 ? dot : name.length;
  let candidate = name;
  for (let copy = 2; taken.has(candidate.toLowerCase()); copy++) {
    candidate = `${name.slice(0, cut)}-${copy}${name.slice(cut)}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
function endsTheBatch(error) {
  return error.code === "NOT_PAIRED" || error.code === "NO_BROWSER" || error.code === "AMBIGUOUS_BROWSER" || error.code === "UNKNOWN_BROWSER" || error.code === "DAEMON_FAILED" || error.code === "PORT_IN_USE";
}

// node_modules/@page-scanner/cli/dist/api.js
init_protocol();

// node_modules/@page-scanner/cli/dist/daemon/client.js
init_errors();
init_version();
import { spawn } from "node:child_process";
import { appendFileSync, openSync } from "node:fs";
init_state();
var DAEMON_START_TIMEOUT_MS = 5e3;
var POLL_INTERVAL_MS = 100;
var SERVE_COMMAND = "npx @page-scanner/cli serve";
var realSleep = (ms) => new Promise((resolve5) => setTimeout(resolve5, ms));
function clientFor(state) {
  return {
    state,
    async call(method, params = {}, timeoutMs = 13e4) {
      let response;
      try {
        response = await fetch(`http://127.0.0.1:${state.rpcPort}/rpc`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${state.secret}`
          },
          body: JSON.stringify({ method, params }),
          // The daemon long-polls a scan, so the client's deadline is the real
          // one. Five seconds of slack over the daemon's own timeout, so its
          // considered answer wins the race against this abort.
          signal: AbortSignal.timeout(timeoutMs + 5e3)
        });
      } catch (error) {
        throw new PageScannerError("DAEMON_FAILED", `The daemon on port ${state.rpcPort} did not answer: ${error instanceof Error ? error.message : String(error)}`, "Run `page-scanner stop` and try again.");
      }
      if (response.status === 401) {
        throw new PageScannerError("DAEMON_FAILED", "The daemon rejected this process. Its secret changed under us.", "Run `page-scanner stop` and try again.");
      }
      const envelope = await response.json();
      if (envelope.ok)
        return envelope.result;
      throw new PageScannerError(envelope.error?.code ?? "SCAN_FAILED", envelope.error?.message ?? "The daemon failed without saying why.", envelope.error?.hint);
    }
  };
}
async function healthy(state) {
  try {
    return await clientFor(state).call("health", {}, 2e3);
  } catch {
    return null;
  }
}
function spawnDaemon(self = selfCommand()) {
  const { command: command2, args } = self;
  let log;
  try {
    log = openSync(daemonLogPath(), "a");
  } catch (error) {
    throw new PageScannerError("DAEMON_FAILED", `Could not open the daemon log at ${daemonLogPath()}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let failure;
  const child = spawn(command2, [...args, "serve", "--daemon"], {
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true
  });
  child.once("error", (error) => {
    failure = new PageScannerError("DAEMON_FAILED", `Could not start the daemon (${command2}): ${error.message}`, `Start it yourself with \`${SERVE_COMMAND}\` in another terminal.`);
  });
  child.once("exit", (code2, signal) => {
    if (code2 === 0)
      return;
    failure ??= new PageScannerError("DAEMON_FAILED", `The daemon exited before it was ready (${signal ?? `exit code ${code2}`}).`, `Its output is in ${daemonLogPath()}.`);
  });
  child.unref();
  return { failure: () => failure };
}
async function startDaemonInProcess() {
  const { runDaemon: runDaemon2 } = await Promise.resolve().then(() => (init_run(), run_exports));
  const log = (message) => {
    try {
      appendFileSync(daemonLogPath(), `${message}
`);
    } catch {
    }
  };
  await new Promise((resolve5, reject) => {
    runDaemon2({ log, handleSignals: false, onListening: () => resolve5() }).then(
      // Returning without listening means another daemon is registered; the
      // wait that follows finds it.
      () => resolve5(),
      reject
    );
  });
}
async function connectDaemon(options = {}) {
  const sleep = options.sleep ?? realSleep;
  const start = options.startDaemon ?? (canSpawnSelf() ? () => spawnDaemon() : startDaemonInProcess);
  const deadlineMs = options.startTimeoutMs ?? DAEMON_START_TIMEOUT_MS;
  const build2 = "build" in options ? options.build : cliBuild();
  const existing = readDaemonState();
  if (existing) {
    const health = await healthy(existing);
    const sameBuild = build2 === void 0 || health?.build === build2;
    if (health && health.version === CLI_VERSION && sameBuild)
      return clientFor(existing);
    if (health) {
      try {
        await clientFor(existing).call("shutdown", {}, 2e3);
      } catch {
      }
      await sleep(POLL_INTERVAL_MS);
    }
    clearDaemonState();
  }
  const started = await start();
  for (let waited = 0; waited < deadlineMs; waited += POLL_INTERVAL_MS) {
    await sleep(POLL_INTERVAL_MS);
    const failure = started?.failure();
    if (failure)
      throw failure;
    const state = readDaemonState();
    if (!state)
      continue;
    const health = await healthy(state);
    if (health)
      return clientFor(state);
  }
  throw new PageScannerError("DAEMON_FAILED", `The daemon did not come up within ${Math.round(deadlineMs / 1e3)}s.`, `Run \`${SERVE_COMMAND}\` in another terminal to see why, or read ${daemonLogPath()}.`);
}
async function stopDaemon() {
  const state = readDaemonState();
  if (!state) {
    clearDaemonState();
    return false;
  }
  try {
    await clientFor(state).call("shutdown", {}, 2e3);
    return true;
  } catch (error) {
    if (!processAlive(state.pid)) {
      clearDaemonState();
      return false;
    }
    throw toPageScannerError(error);
  }
}

// node_modules/@page-scanner/cli/dist/api.js
init_state();
init_version();

// node_modules/@page-scanner/cli/dist/design/color.js
var clamp01 = (value) => Math.min(1, Math.max(0, value));
var toLinear = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
var toGamma = (c) => c <= 31308e-7 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
function component(raw, full) {
  const text = raw.trim();
  if (text === "none")
    return 0;
  if (text.endsWith("%"))
    return Number.parseFloat(text) / 100 * full;
  return Number.parseFloat(text);
}
function alphaOf(raw) {
  if (raw === void 0)
    return 1;
  const value = component(raw, 1);
  return Number.isFinite(value) ? clamp01(value) : 1;
}
function parts(inner) {
  const [main2, slashAlpha] = inner.split("/");
  const values = (main2 ?? "").split(/[\s,]+/).map((part) => part.trim()).filter(Boolean);
  if (slashAlpha !== void 0)
    return { values, alpha: slashAlpha.trim() };
  if (values.length === 4)
    return { values: values.slice(0, 3), alpha: values[3] };
  return { values };
}
function fromLinear(r, g, b, a) {
  return {
    r: clamp01(toGamma(r)),
    g: clamp01(toGamma(g)),
    b: clamp01(toGamma(b)),
    a
  };
}
function oklabToLinearSrgb(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
function labToLinearSrgb(L, A, B) {
  const fy = (L + 16) / 116;
  const fx = fy + A / 500;
  const fz = fy - B / 200;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const x = (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * 0.3457 / 0.3585;
  const y = L > k * e ? fy ** 3 : L / k;
  const z = (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * (1 - 0.3457 - 0.3585) / 0.3585;
  const X = 0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z;
  const Y = -0.028369706963208136 * x + 1.0099954580058226 * y + 0.021041398966943008 * z;
  const Z = 0.012314001688319899 * x - 0.020507696433477912 * y + 1.3303659366080753 * z;
  return [
    3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z,
    -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z,
    0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z
  ];
}
function displayP3ToLinearSrgb(r, g, b) {
  const [R, G, B] = [r, g, b].map((c) => toLinear(clamp01(c)));
  return [
    1.2249401762805598 * R - 0.22494017628055996 * G,
    -0.04205695470968816 * R + 1.042056954709688 * G,
    -0.019637554590334432 * R - 0.07863604555063189 * G + 1.0982736001409663 * B
  ];
}
function hslToRgb(h, s, l, a) {
  const hue = (h % 360 + 360) % 360 / 30;
  const k = (n) => (n + hue) % 12;
  const chroma2 = s * Math.min(l, 1 - l);
  const f = (n) => l - chroma2 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: clamp01(f(0)), g: clamp01(f(8)), b: clamp01(f(4)), a };
}
function relativeColor(fn, inner) {
  const body = inner.replace(/^from\s+/, "");
  let depth = 0;
  let end = 0;
  for (; end < body.length; end += 1) {
    const char = body[end];
    if (char === "(")
      depth += 1;
    else if (char === ")")
      depth -= 1;
    else if (/\s/.test(char) && depth === 0)
      break;
  }
  const origin = parseColor(body.slice(0, end));
  if (!origin)
    return null;
  const { values, alpha } = parts(body.slice(end));
  const identity = {
    rgb: ["r", "g", "b"],
    hsl: ["h", "s", "l"],
    oklch: ["l", "c", "h"],
    oklab: ["l", "a", "b"],
    lch: ["l", "c", "h"],
    lab: ["l", "a", "b"]
  };
  const kept = identity[fn];
  if (!kept || values.join(" ") !== kept.join(" "))
    return null;
  return { ...origin, a: alpha === void 0 || alpha === "alpha" ? origin.a : alphaOf(alpha) * 1 };
}
var NAMED = "aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32";
var NAMED_COLORS = new Map(NAMED.split(",").map((entry) => entry.split(":")));
function parseColor(input) {
  const text = input.trim().toLowerCase();
  if (text === "transparent")
    return { r: 0, g: 0, b: 0, a: 0 };
  const named = NAMED_COLORS.get(text);
  if (named)
    return parseColor(`#${named}`);
  const hex2 = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex2 && [3, 4, 6, 8].includes(hex2.length)) {
    const full = hex2.length <= 4 ? [...hex2].map((c) => c + c).join("") : hex2;
    const channel = (i) => Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return { r: channel(0), g: channel(2), b: channel(4), a: full.length === 8 ? channel(6) : 1 };
  }
  const match = /^([a-z-]+)\((.*)\)$/.exec(text);
  if (!match)
    return null;
  const [, fn = "", inner = ""] = match;
  if (/^\s*from\s/.test(inner))
    return relativeColor(fn, inner.trim());
  const { values, alpha } = parts(inner);
  const a = alphaOf(alpha);
  switch (fn) {
    case "rgb":
    case "rgba": {
      if (values.length < 3)
        return null;
      const [r, g, b] = values.map((value) => component(value, 255) / 255);
      if (![r, g, b].every(Number.isFinite))
        return null;
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a };
    }
    case "hsl":
    case "hsla": {
      if (values.length < 3)
        return null;
      const h = Number.parseFloat(values[0].replace(/deg$/, ""));
      const s = component(values[1], 1);
      const l = component(values[2], 1);
      if (![h, s, l].every(Number.isFinite))
        return null;
      return hslToRgb(h, s > 1 ? s / 100 : s, l > 1 ? l / 100 : l, a);
    }
    case "oklab": {
      const [L, A, B] = [
        component(values[0] ?? "", 1),
        component(values[1] ?? "", 0.4),
        component(values[2] ?? "", 0.4)
      ];
      return fromLinear(...oklabToLinearSrgb(L, A, B), a);
    }
    case "oklch": {
      const L = component(values[0] ?? "", 1);
      const C = component(values[1] ?? "", 0.4);
      const h = Number.parseFloat(values[2] ?? "0") * Math.PI / 180 || 0;
      return fromLinear(...oklabToLinearSrgb(L, C * Math.cos(h), C * Math.sin(h)), a);
    }
    case "lab": {
      const [L, A, B] = [
        component(values[0] ?? "", 100),
        component(values[1] ?? "", 125),
        component(values[2] ?? "", 125)
      ];
      return fromLinear(...labToLinearSrgb(L, A, B), a);
    }
    case "lch": {
      const L = component(values[0] ?? "", 100);
      const C = component(values[1] ?? "", 150);
      const h = Number.parseFloat(values[2] ?? "0") * Math.PI / 180 || 0;
      return fromLinear(...labToLinearSrgb(L, C * Math.cos(h), C * Math.sin(h)), a);
    }
    case "color": {
      const [main2 = "", slash] = inner.split("/");
      const [space, ...rest] = main2.trim().split(/\s+/);
      const a2 = alphaOf(slash?.trim());
      const [x, y, z] = rest.map((value) => component(value, 1));
      if (![x, y, z].every((n) => Number.isFinite(n)))
        return null;
      if (space === "srgb")
        return { r: clamp01(x), g: clamp01(y), b: clamp01(z), a: a2 };
      if (space === "srgb-linear")
        return fromLinear(x, y, z, a2);
      if (space === "display-p3")
        return fromLinear(...displayP3ToLinearSrgb(x, y, z), a2);
      return null;
    }
    default:
      return null;
  }
}
function toHex(color) {
  const byte = (c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0");
  const alpha = color.a < 0.999 ? byte(color.a) : "";
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${alpha}`;
}
function toOklab(color) {
  const [r, g, b] = [color.r, color.g, color.b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}
function deltaE(a, b) {
  const x = toOklab(a);
  const y = toOklab(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b, a.a - b.a);
}
function chroma(color) {
  const { a, b } = toOklab(color);
  return Math.hypot(a, b);
}
function composite(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0)
    return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t, u) => (t * top.a + u * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}
function luminance(color) {
  const [r, g, b] = [color.r, color.g, color.b].map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(text, background) {
  const ground = composite(background, { r: 1, g: 1, b: 1, a: 1 });
  const ink = composite(text, ground);
  const [light, dark] = [luminance(ink), luminance(ground)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// node_modules/@page-scanner/cli/dist/design/tokens.js
var SAME_COLOR = 0.012;
var DEFAULT_MIN_USES = 2;
var SAME_ALPHA = 0.05;
var COLOR_PROPERTIES = {
  color: "text",
  "background-color": "background",
  "border-top-color": "border"
};
var SPACE_PROPERTIES = [
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "row-gap",
  "column-gap"
];
var byUseThenValue = (a, b) => b.uses - a.uses || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
var NUMBER = "-?\\d*\\.?\\d+(?:e[+-]?\\d+)?";
function pxValue(raw) {
  const match = new RegExp(`^(${NUMBER})px$`, "i").exec(raw.trim());
  if (!match)
    return null;
  return `${Number(Number(match[1]).toFixed(2))}px`;
}
var PILL_RADIUS = "9999px";
function radiusValue(raw) {
  const px4 = pxValue(raw);
  return px4 && Number.parseFloat(px4) >= 1e3 ? PILL_RADIUS : px4;
}
function easingValue(raw) {
  const value = raw.trim();
  const bezier2 = /^cubic-bezier\(([^)]*)\)$/.exec(value);
  if (bezier2) {
    const numbers = bezier2[1].split(",").map((part) => Number(part.trim()));
    if (numbers.length === 4 && numbers.every(Number.isFinite)) {
      return `cubic-bezier(${numbers.join(", ")})`;
    }
  }
  return /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/.test(value) ? value : null;
}
function lengthGroupOf(name) {
  const words = name.toLowerCase();
  if (/radius|rounded/.test(words))
    return "radius";
  if (/leading|line-height/.test(words))
    return "lineHeight";
  if (/tracking|letter-spacing/.test(words))
    return "letterSpacing";
  if (/font-size|^--text-|^--font-size/.test(words))
    return "fontSize";
  if (/space|spacing|gap|padding|margin|gutter|inset/.test(words))
    return "space";
  return null;
}
function addCounts(into, counts, normalize2) {
  for (const [raw, count] of Object.entries(counts ?? {})) {
    const value = normalize2(raw);
    if (value !== null)
      into.set(value, (into.get(value) ?? 0) + count);
  }
}
function clusterColors(values) {
  const seen = /* @__PURE__ */ new Map();
  for (const [property, role] of Object.entries(COLOR_PROPERTIES)) {
    for (const [raw, count] of Object.entries(values[property] ?? {})) {
      const color = parseColor(raw);
      if (!color || color.a === 0)
        continue;
      const hex2 = toHex(color);
      const entry = seen.get(hex2) ?? { color, hex: hex2, uses: 0, usedAs: {} };
      entry.uses += count;
      entry.usedAs[role] = (entry.usedAs[role] ?? 0) + count;
      seen.set(hex2, entry);
    }
  }
  const sorted = [...seen.values()].sort((a, b) => b.uses - a.uses || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  const clusters = [];
  for (const entry of sorted) {
    const home = clusters.find((cluster) => deltaE(cluster.color, entry.color) < SAME_COLOR);
    if (!home) {
      clusters.push({ ...entry, usedAs: { ...entry.usedAs } });
      continue;
    }
    home.uses += entry.uses;
    for (const [role, count] of Object.entries(entry.usedAs)) {
      home.usedAs[role] = (home.usedAs[role] ?? 0) + count;
    }
  }
  return clusters;
}
var FRAMEWORK_VARIABLE = /^--(tw|radix)-/;
function designVariables(scheme) {
  return Object.entries(scheme.variables).filter(([name]) => !FRAMEWORK_VARIABLE.test(name)).sort(([a], [b]) => a < b ? -1 : 1);
}
var HSL_CHANNELS = /^(-?\d*\.?\d+)(deg)?\s+(\d*\.?\d+%)\s+(\d*\.?\d+%)$/;
var REM_PX = 16;
function classifyVariable(value, name = "") {
  const channels = HSL_CHANNELS.exec(value.trim());
  const color = parseColor(channels ? `hsl(${channels[1]} ${channels[3]} ${channels[4]})` : value);
  if (color)
    return { group: "color", value: toHex(color) };
  const px4 = pxValue(value);
  if (px4)
    return { group: "dimension", value: px4 };
  const rem = new RegExp(`^(${NUMBER})rem$`, "i").exec(value.trim());
  if (rem)
    return { group: "dimension", value: `${Number((Number(rem[1]) * REM_PX).toFixed(2))}px` };
  const ms = /^(-?\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (ms)
    return { group: "duration", value: `${Number(ms[1]) * (ms[2] === "s" ? 1e3 : 1)}ms` };
  const easing = easingValue(value);
  if (easing)
    return { group: "easing", value: easing };
  if (/weight/i.test(name) && /^\d{3}$/.test(value.trim())) {
    return { group: "fontWeight", value: value.trim() };
  }
  return null;
}
function inferred(group, prefix, counts, minUses, claimed) {
  const entries = [...counts.entries()].map(([value, uses]) => ({ value, uses })).filter((entry) => entry.uses >= minUses).sort(byUseThenValue);
  const tokens = [];
  let n = 0;
  for (const entry of entries) {
    const declared = claimed.get(`${group}:${entry.value}`);
    if (declared) {
      declared.uses += entry.uses;
      continue;
    }
    n += 1;
    tokens.push({
      group,
      name: `${prefix}-${n}`,
      value: entry.value,
      uses: entry.uses,
      source: "inferred"
    });
  }
  return tokens;
}
function schemeTokens(scheme, minUses) {
  const tokens = [];
  const claimed = /* @__PURE__ */ new Map();
  const variables = designVariables(scheme).sort(([a], [b]) => a.length - b.length || (a < b ? -1 : 1));
  for (const [name, raw] of variables) {
    const kind = classifyVariable(raw, name);
    if (!kind)
      continue;
    const token = {
      group: kind.group,
      name,
      value: kind.value,
      uses: 0,
      source: "declared",
      variable: name
    };
    tokens.push(token);
    const claims = kind.group === "dimension" ? lengthGroupOf(name) : kind.group;
    if (!claims)
      continue;
    const value = claims === "radius" ? radiusValue(kind.value) ?? kind.value : kind.value;
    const key = `${claims}:${value}`;
    if (!claimed.has(key))
      claimed.set(key, token);
  }
  tokens.sort((a, b) => a.name < b.name ? -1 : 1);
  const { values } = scheme;
  const clusters = clusterColors(values);
  let n = 0;
  for (const cluster of clusters) {
    const declared = claimed.get(`color:${cluster.hex}`);
    if (declared) {
      declared.uses += cluster.uses;
      declared.usedAs = cluster.usedAs;
      continue;
    }
    if (cluster.uses < minUses)
      continue;
    n += 1;
    tokens.push({
      group: "color",
      name: `color-${n}`,
      value: cluster.hex,
      uses: cluster.uses,
      source: "inferred",
      usedAs: cluster.usedAs
    });
  }
  const map = (properties, normalize2) => {
    const counts = /* @__PURE__ */ new Map();
    for (const property of properties)
      addCounts(counts, values[property], normalize2);
    return counts;
  };
  const keep = (raw) => raw.trim() || null;
  tokens.push(...inferred("fontSize", "font-size", map(["font-size"], pxValue), minUses, claimed));
  tokens.push(...inferred("fontFamily", "font-family", map(["font-family"], keep), minUses, /* @__PURE__ */ new Map()));
  tokens.push(...inferred("fontWeight", "font-weight", map(["font-weight"], keep), minUses, claimed));
  tokens.push(...inferred("lineHeight", "line-height", map(["line-height"], (raw) => pxValue(raw) ?? (raw === "normal" ? "normal" : null)), minUses, claimed));
  tokens.push(...inferred("letterSpacing", "letter-spacing", map(["letter-spacing"], pxValue), minUses, claimed));
  tokens.push(...inferred("space", "space", map(SPACE_PROPERTIES, (raw) => {
    const px4 = pxValue(raw);
    return px4 && !px4.startsWith("-") ? px4 : null;
  }), minUses, claimed));
  tokens.push(...inferred("radius", "radius", map(["border-top-left-radius", "border-bottom-right-radius"], radiusValue), minUses, claimed));
  tokens.push(...inferred("shadow", "shadow", map(["box-shadow"], keep), minUses, /* @__PURE__ */ new Map()));
  tokens.push(...inferred("duration", "duration", map(["transition-duration"], (raw) => {
    const first = raw.split(",")[0].trim();
    return classifyVariable(first)?.group === "duration" ? classifyVariable(first).value : null;
  }), minUses, claimed));
  tokens.push(...inferred("easing", "easing", map(["transition-timing-function"], (raw) => easingValue(raw.split(/,(?![^(]*\))/)[0].trim())), minUses, claimed));
  return tokens;
}
function foldBreakpoints(widths) {
  const sorted = [...new Set(widths)].sort((a, b) => a - b);
  return sorted.filter((width, i) => {
    const next = sorted[i + 1];
    return next === void 0 || next - width > 1;
  });
}
function mainUse(token) {
  return Object.entries(token.usedAs ?? {}).sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))[0]?.[0];
}
function buildTokens(extract, minUses = DEFAULT_MIN_USES) {
  const light = schemeTokens(extract.schemes.light, minUses);
  const dark = schemeTokens(extract.schemes.dark, minUses);
  let darkDiffers = false;
  const darkVariables = new Map(dark.filter((token) => token.variable).map((token) => [token.variable, token]));
  for (const token of light) {
    if (!token.variable)
      continue;
    const twin = darkVariables.get(token.variable);
    const value = twin?.group === token.group ? twin.value : void 0;
    if (value !== void 0 && value !== token.value) {
      token.dark = value;
      darkDiffers = true;
    }
  }
  const lightColors = light.filter((token) => token.group === "color" && !token.variable);
  const darkColors = dark.filter((token) => token.group === "color" && !token.variable);
  const drawn = (tokens) => tokens.filter((token) => token.group === "color" && token.uses > 0).map((token) => parseColor(token.value));
  const drawnInLight = drawn(light);
  const drawnInDark = drawn(dark);
  const drawnNear = (colors, color) => colors.some((other) => deltaE(other, color) < SAME_COLOR);
  lightColors.forEach((token, index) => {
    const other = darkColors[index];
    if (!other || mainUse(token) !== mainUse(other))
      return;
    const from = parseColor(token.value);
    const to = parseColor(other.value);
    if (deltaE(from, to) < SAME_COLOR || Math.abs(from.a - to.a) > SAME_ALPHA)
      return;
    if (drawnNear(drawnInDark, from) || drawnNear(drawnInLight, to))
      return;
    token.dark = other.value;
    darkDiffers = true;
  });
  const byValue = /* @__PURE__ */ new Map();
  const heads = [];
  const declared = light.filter((token) => token.source === "declared").sort((a, b) => b.uses - a.uses || a.name.length - b.name.length || (a.name < b.name ? -1 : 1));
  for (const token of declared) {
    const lightColor = token.group === "color" ? parseColor(token.value) : null;
    const darkColor = token.group === "color" ? parseColor(token.dark ?? token.value) : null;
    if (lightColor && darkColor) {
      const near2 = heads.find((head) => deltaE(head.light, lightColor) < SAME_COLOR && deltaE(head.dark, darkColor) < SAME_COLOR);
      const key2 = near2?.key ?? `color|${heads.length}`;
      if (!near2)
        heads.push({ token, light: lightColor, dark: darkColor, key: key2 });
      byValue.set(key2, [...byValue.get(key2) ?? [], token]);
      continue;
    }
    const claims = token.group === "dimension" ? lengthGroupOf(token.name) : token.group;
    const key = `${token.group}|${claims ?? token.name}|${token.value}|${token.dark ?? ""}`;
    byValue.set(key, [...byValue.get(key) ?? [], token]);
  }
  const folded = /* @__PURE__ */ new Set();
  for (const twins of byValue.values()) {
    if (twins.length < 2)
      continue;
    const [head, ...rest] = [...twins].sort((a, b) => b.uses - a.uses || a.name.length - b.name.length || (a.name < b.name ? -1 : 1));
    head.aliases = rest.map((token) => token.name).sort();
    for (const twin of rest) {
      head.uses += twin.uses;
      for (const [as, count] of Object.entries(twin.usedAs ?? {})) {
        head.usedAs = { ...head.usedAs, [as]: (head.usedAs?.[as] ?? 0) + count };
      }
      folded.add(twin);
    }
  }
  const usedInDark = new Set(dark.filter((token) => token.variable && token.uses > 0).map((token) => token.variable));
  const unused = (token) => token.source === "declared" && token.group === "color" && token.uses === 0 && !usedInDark.has(token.variable);
  const unusedDeclared = light.filter((token) => !folded.has(token) && unused(token)).length;
  const breakpoints = foldBreakpoints(extract.breakpoints).map((width, index) => ({
    group: "breakpoint",
    name: `breakpoint-${index + 1}`,
    value: `${width}px`,
    uses: 0,
    source: "declared"
  }));
  return {
    url: extract.url,
    title: extract.title,
    tokens: [...light.filter((token) => !folded.has(token) && !unused(token)), ...breakpoints],
    darkDiffers,
    unusedDeclared
  };
}
function readFrom(tokens) {
  const pages = tokens.pages ?? [tokens.url];
  if (pages.length === 1)
    return tokens.url;
  let host = tokens.url;
  try {
    host = new URL(tokens.url).host;
  } catch {
  }
  return `${pages.length} pages of ${host}`;
}
function isGray(hex2) {
  const color = parseColor(hex2);
  return color !== null && chroma(color) < 0.02;
}

// node_modules/@page-scanner/cli/dist/design/reports.js
var NEAR_COLOR = 0.04;
var px = (value) => Number.parseFloat(value);
function rareBeside(rare, common) {
  return rare * 2 <= common && rare <= Math.max(2, common * 0.05);
}
function nearLengths(group, counts, within) {
  const values = [...counts.entries()].filter(([value]) => Number.isFinite(px(value))).sort(([a], [b]) => px(a) - px(b));
  const pairs = [];
  values.forEach(([value, uses], i) => {
    let best;
    for (const j of [i - 1, i + 1, i - 2, i + 2]) {
      const other = values[j];
      if (!other)
        continue;
      const gap = Math.abs(px(other[0]) - px(value));
      if (gap === 0 || gap > within + 1e-9)
        continue;
      if (!rareBeside(uses, other[1]))
        continue;
      if (!best || other[1] > best[1])
        best = other;
    }
    if (!best)
      return;
    const [a, b] = px(value) < px(best[0]) ? [value, best[0]] : [best[0], value];
    pairs.push({
      group,
      a,
      b,
      uses: a === value ? [uses, best[1]] : [best[1], uses],
      distance: Math.round(Math.abs(px(best[0]) - px(value)) * 100) / 100
    });
  });
  return pairs;
}
function counted(scheme, properties, radius = false) {
  const counts = /* @__PURE__ */ new Map();
  for (const property of properties) {
    for (const [value, count] of Object.entries(scheme.values[property] ?? {})) {
      if (!/^\d*\.?\d+(e[+-]?\d+)?px$/i.test(value))
        continue;
      const key = radius && px(value) >= 1e3 ? PILL_RADIUS : `${Number(px(value).toFixed(2))}px`;
      counts.set(key, (counts.get(key) ?? 0) + count);
    }
  }
  return counts;
}
function auditScheme(scheme) {
  const clusters = clusterColors(scheme.values);
  const declared = new Set(designVariables(scheme).flatMap(([, value]) => {
    const color = parseColor(value);
    return color ? [toHex(color)] : [];
  }));
  const near2 = [];
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const a = clusters[i];
      const b = clusters[j];
      if (declared.has(a.hex) && declared.has(b.hex))
        continue;
      const distance = deltaE(a.color, b.color);
      if (distance >= SAME_COLOR && distance < NEAR_COLOR) {
        near2.push({
          group: "color",
          a: a.hex,
          b: b.hex,
          uses: [a.uses, b.uses],
          distance: Math.round(distance * 1e3) / 1e3
        });
      }
    }
  }
  const radius = counted(scheme, ["border-top-left-radius", "border-bottom-right-radius"], true);
  const fontSize = counted(scheme, ["font-size"]);
  const space = counted(scheme, [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "row-gap",
    "column-gap"
  ]);
  near2.push(...nearLengths("radius", radius, 1));
  near2.push(...nearLengths("fontSize", fontSize, 1));
  near2.push(...nearLengths("space", space, 1));
  const grays = clusters.filter((cluster) => isGray(cluster.hex));
  const spreadOf = (counts) => ({
    values: counts.size,
    usedOnce: [...counts.values()].filter((count) => count === 1).length
  });
  return {
    near: near2.sort((x, y) => (x.group < y.group ? -1 : x.group > y.group ? 1 : 0) || x.distance - y.distance || (x.a < y.a ? -1 : 1)),
    colors: {
      total: clusters.length,
      grays: grays.length,
      usedOnce: clusters.filter((cluster) => cluster.uses === 1).length,
      graysUsedOnce: grays.filter((cluster) => cluster.uses === 1).length
    },
    spread: {
      radius: spreadOf(radius),
      fontSize: spreadOf(fontSize),
      space: spreadOf(space)
    }
  };
}
function measuredPairs(pairs) {
  return pairs.filter((pair2) => !pair2.overImage);
}
var WHITE = { r: 1, g: 1, b: 1, a: 1 };
function contrastReport(schemes) {
  const merged = /* @__PURE__ */ new Map();
  const pairs = schemes.flatMap(({ text, canvas }) => {
    const base = composite(parseColor(canvas) ?? WHITE, WHITE);
    return text.map((pair2) => ({ pair: pair2, base }));
  });
  for (const { pair: pair2, base } of pairs) {
    const text = parseColor(pair2.color);
    const drawn = parseColor(pair2.background);
    if (!text || !drawn || text.a === 0)
      continue;
    const ground = composite(drawn, base);
    const large = pair2.size >= 24 || pair2.size >= 18.66 && pair2.weight >= 700;
    const color = toHex(text);
    const background = toHex(ground);
    const overImage = pair2.overImage === true;
    const key = `${color}|${background}|${large}|${overImage}`;
    const ratio = Math.round(contrastRatio(text, ground) * 100) / 100;
    const entry = merged.get(key) ?? {
      color,
      background,
      ratio,
      large,
      passesAA: ratio >= (large ? 3 : 4.5),
      passesAAA: ratio >= (large ? 4.5 : 7),
      count: 0,
      sizes: [],
      overImage
    };
    entry.count += pair2.count;
    if (!entry.sizes.includes(pair2.size))
      entry.sizes.push(pair2.size);
    merged.set(key, entry);
  }
  return [...merged.values()].map((entry) => ({ ...entry, sizes: [...entry.sizes].sort((a, b) => a - b) })).sort((a, b) => Number(a.overImage) - Number(b.overImage) || Number(a.passesAA) - Number(b.passesAA) || a.ratio - b.ratio || b.count - a.count || (a.color + a.background < b.color + b.background ? -1 : 1));
}
var plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
var MAX_ONE_PAGE_ROWS = 30;
function source(tokens) {
  const pages = tokens.pages ?? [];
  if (pages.length < 2)
    return [`${tokens.title || tokens.url}, ${tokens.url}`];
  return [
    `${tokens.title || tokens.url}, ${readFrom(tokens)}:`,
    "",
    ...pages.map((page) => `- ${page}`)
  ];
}
function auditMarkdown(tokens, audit) {
  const lines = [
    `# Consistency audit`,
    "",
    ...source(tokens),
    "",
    `- ${plural(audit.colors.total, "color")} in use, ${plural(audit.colors.grays, "gray")} among them; ${plural(audit.colors.usedOnce, "color")} used once (${audit.colors.graysUsedOnce} of them gray).`,
    ...Object.entries(audit.spread).map(([group, spread]) => `- ${group}: ${plural(spread.values, "value")}, ${spread.usedOnce} used once.`),
    ""
  ];
  if (audit.near.length === 0) {
    lines.push("No two values are close enough to look like one meant twice.", "");
  } else {
    lines.push("## Nearly equal, probably meant to be one", "");
    lines.push("| What | One | Uses | The other | Uses | Apart |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const pair2 of audit.near) {
      const apart = pair2.group === "color" ? `\u0394E ${pair2.distance}` : `${pair2.distance}px`;
      lines.push(`| ${pair2.group} | \`${pair2.a}\` | ${pair2.uses[0]} | \`${pair2.b}\` | ${pair2.uses[1]} | ${apart} |`);
    }
    lines.push("");
  }
  const onePage = audit.onePage ?? [];
  if (onePage.length > 0) {
    lines.push("## Used on one page only", "");
    lines.push(`${plural(onePage.length, "value")} that one page uses and no other does, most used first` + (onePage.length > MAX_ONE_PAGE_ROWS ? ` (the first ${MAX_ONE_PAGE_ROWS})` : "") + ". A value here is either what that page is for, or a slip.", "");
    lines.push("| What | Value | Uses | Only on |");
    lines.push("| --- | --- | --- | --- |");
    for (const row of onePage.slice(0, MAX_ONE_PAGE_ROWS)) {
      lines.push(`| ${row.group} | \`${row.value}\` | ${row.uses} | ${row.page} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function contrastMarkdown(tokens, pairs) {
  const measured = measuredPairs(pairs);
  const overImage = pairs.filter((pair2) => pair2.overImage);
  const failing = measured.filter((pair2) => !pair2.passesAA);
  const row = (pair2) => `| \`${pair2.color}\` | \`${pair2.background}\` | ${pair2.ratio.toFixed(2)} | ${pair2.large ? "yes" : "no"} | ${pair2.passesAA ? "pass" : "fail"} | ${pair2.passesAAA ? "pass" : "fail"} | ${pair2.count} | ${pair2.sizes.join(", ")} |`;
  const header = [
    "| Text | Background | Ratio | Large | AA | AAA | Text runs | Sizes (px) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  const lines = [
    `# Contrast`,
    "",
    ...source(tokens),
    "",
    `${plural(measured.length, "text color and background pair")} in use; ${failing.length} below WCAG 2 AA (4.5:1, or 3:1 for text 24 px or 18.66 px bold and up).`,
    "",
    ...header,
    ...measured.map(row),
    ""
  ];
  if (overImage.length > 0) {
    lines.push("## Over a gradient or a picture, not measured", "", `${plural(overImage.length, "pair")} of text drawn over a \`background-image\`. The ratio is against the color under the picture, which is not what a reader sees, so these are neither passed nor failed. Check them by eye.`, "", "| Text | Color under it | Ratio to that color | Text runs | Sizes (px) |", "| --- | --- | --- | --- | --- |", ...overImage.map((pair2) => `| \`${pair2.color}\` | \`${pair2.background}\` | ${pair2.ratio.toFixed(2)} | ${pair2.count} | ${pair2.sizes.join(", ")} |`), "");
  }
  return lines.join("\n");
}

// node_modules/@page-scanner/cli/dist/design/merge.js
function mostCommon(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of values)
    counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = values[0];
  for (const value of values) {
    if ((counts.get(value) ?? 0) > (counts.get(best) ?? 0))
      best = value;
  }
  return best;
}
var sortedRecord = (record) => Object.fromEntries(Object.entries(record).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
function mergeScheme(schemes) {
  const names = new Set(schemes.flatMap((scheme) => Object.keys(scheme.variables)));
  const variables = {};
  for (const name of names) {
    const given = schemes.flatMap((scheme) => scheme.variables[name] !== void 0 ? [scheme.variables[name]] : []);
    variables[name] = mostCommon(given);
  }
  const values = {};
  for (const scheme of schemes) {
    for (const [property, counts] of Object.entries(scheme.values)) {
      const into = values[property] ??= {};
      for (const [value, count] of Object.entries(counts))
        into[value] = (into[value] ?? 0) + count;
    }
  }
  const pairs = /* @__PURE__ */ new Map();
  for (const scheme of schemes) {
    for (const pair2 of scheme.text) {
      const key = `${pair2.color}|${pair2.background}|${pair2.size}|${pair2.weight}|${pair2.overImage === true}`;
      const known = pairs.get(key);
      if (known)
        known.count += pair2.count;
      else
        pairs.set(key, { ...pair2 });
    }
  }
  return {
    variables: sortedRecord(variables),
    canvas: mostCommon(schemes.map((scheme) => scheme.canvas)),
    values: sortedRecord(Object.fromEntries(Object.entries(values).map(([key, counts]) => [key, sortedRecord(counts)]))),
    text: [...pairs.values()].sort((a, b) => b.count - a.count || (a.color + a.background < b.color + b.background ? -1 : 1)),
    elements: schemes.reduce((sum, scheme) => sum + scheme.elements, 0),
    textRuns: schemes.reduce((sum, scheme) => sum + scheme.textRuns, 0)
  };
}
function mergeExtracts(pages) {
  const first = pages[0];
  if (!first)
    throw new Error("mergeExtracts needs at least one page.");
  if (pages.length === 1)
    return first;
  return {
    url: first.url,
    title: first.title,
    capturedAt: Math.min(...pages.map((page) => page.capturedAt)),
    viewport: first.viewport,
    schemes: {
      light: mergeScheme(pages.map((page) => page.schemes.light)),
      dark: mergeScheme(pages.map((page) => page.schemes.dark))
    },
    breakpoints: [...new Set(pages.flatMap((page) => page.breakpoints))].sort((a, b) => a - b)
  };
}
function pageLabel(url, first) {
  try {
    const page = new URL(url);
    const home = new URL(first);
    return page.host === home.host ? `${page.pathname}${page.search}` || "/" : url;
  } catch {
    return url;
  }
}
var LENGTHS = {
  radius: ["border-top-left-radius", "border-bottom-right-radius"],
  fontSize: ["font-size"],
  space: [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "row-gap",
    "column-gap"
  ]
};
var px2 = (value, group) => {
  const match = /^(-?\d*\.?\d+(?:e[+-]?\d+)?)px$/i.exec(value.trim());
  if (!match)
    return null;
  const n = Number(match[1]);
  return group === "radius" && n >= 1e3 ? PILL_RADIUS : `${Number(n.toFixed(2))}px`;
};
function onePageValues(pages) {
  if (pages.length < 2)
    return [];
  const label = (page) => pageLabel(page.url, pages[0].url);
  const found = [];
  const site = clusterColors(mergeExtracts(pages).schemes.light.values);
  for (const cluster of site) {
    const on = pages.filter((page) => clusterColors(page.schemes.light.values).some((mine) => deltaE(mine.color, cluster.color) < SAME_COLOR));
    if (on.length === 1) {
      found.push({ group: "color", value: cluster.hex, uses: cluster.uses, page: label(on[0]) });
    }
  }
  for (const [group, properties] of Object.entries(LENGTHS)) {
    const perPage = pages.map((page) => {
      const counts = /* @__PURE__ */ new Map();
      for (const property of properties) {
        for (const [raw, count] of Object.entries(page.schemes.light.values[property] ?? {})) {
          const value = px2(raw, group);
          if (value && !value.startsWith("-") && value !== "0px") {
            counts.set(value, (counts.get(value) ?? 0) + count);
          }
        }
      }
      return counts;
    });
    const all = new Set(perPage.flatMap((counts) => [...counts.keys()]));
    for (const value of all) {
      const on = perPage.flatMap((counts, index) => counts.has(value) ? [index] : []);
      if (on.length === 1) {
        found.push({
          group,
          value,
          uses: perPage[on[0]].get(value),
          page: label(pages[on[0]])
        });
      }
    }
  }
  return found.sort((a, b) => b.uses - a.uses || (a.group < b.group ? -1 : a.group > b.group ? 1 : 0) || (a.value < b.value ? -1 : 1));
}

// node_modules/@page-scanner/cli/dist/design/files.js
var EXTENSION = "app.pagescanner";
function tokenKey(token) {
  return token.name.replace(/^--/, "").replace(/[.{}$]/g, "_");
}
function propertyOf(token) {
  return token.variable ?? `--${tokenKey(token)}`;
}
var EASINGS = {
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1]
};
function bezier(value) {
  if (EASINGS[value])
    return EASINGS[value];
  const match = /^cubic-bezier\(([^)]*)\)$/.exec(value);
  const numbers = match?.[1]?.split(",").map((part) => Number(part.trim()));
  return numbers && numbers.length === 4 && numbers.every(Number.isFinite) ? numbers : null;
}
function shadow(value) {
  const layers = value.split(/,(?![^(]*\))/).map((layer) => layer.trim());
  const parsed = layers.map((layer) => {
    const color = /^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+\([^)]*\))/i.exec(layer)?.[1];
    const lengths = layer.replace(color ?? "", "").trim().split(/\s+/);
    const inset = lengths.includes("inset");
    const [offsetX, offsetY, blur = "0px", spread = "0px"] = lengths.filter((l) => l !== "inset");
    if (!color || !offsetX || !offsetY)
      return null;
    return { color, offsetX, offsetY, blur, spread, ...inset ? { inset: true } : {} };
  });
  if (parsed.some((layer) => layer === null))
    return null;
  return parsed.length === 1 ? parsed[0] : parsed;
}
function families(stack) {
  return stack.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((family) => family.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}
function placement(token) {
  const key = tokenKey(token);
  switch (token.group) {
    case "color":
      return { path: ["color", key], type: "color", value: token.value };
    case "fontFamily":
      return { path: ["font", "family", key], type: "fontFamily", value: families(token.value) };
    case "fontSize":
      return { path: ["font", "size", key], type: "dimension", value: token.value };
    case "fontWeight":
      return {
        path: ["font", "weight", key],
        type: "fontWeight",
        value: Number(token.value) || token.value
      };
    case "lineHeight":
      return token.value === "normal" ? null : { path: ["font", "lineHeight", key], type: "dimension", value: token.value };
    case "letterSpacing":
      return { path: ["font", "letterSpacing", key], type: "dimension", value: token.value };
    case "space":
      return { path: ["space", key], type: "dimension", value: token.value };
    case "radius":
      return { path: ["radius", key], type: "dimension", value: token.value };
    case "dimension":
      return { path: ["dimension", key], type: "dimension", value: token.value };
    case "shadow": {
      const value = shadow(token.value);
      return value ? { path: ["shadow", key], type: "shadow", value } : { path: ["shadow", key], value: token.value };
    }
    case "duration":
      return { path: ["duration", key], type: "duration", value: token.value };
    case "easing": {
      const value = bezier(token.value);
      return value ? { path: ["easing", key], type: "cubicBezier", value } : { path: ["easing", key], value: token.value };
    }
    case "breakpoint":
      return { path: ["breakpoint", key], type: "dimension", value: token.value };
  }
}
function tokensJson(tokens) {
  const root = {
    $description: `Design tokens read from ${readFrom(tokens)} by Page Scanner. Inferred names are numbered by use; declared ones are the page's own custom properties.`
  };
  for (const token of tokens.tokens) {
    const place = placement(token);
    if (!place)
      continue;
    let node = root;
    for (const part of place.path.slice(0, -1)) {
      node = node[part] ??= {};
    }
    node[place.path.at(-1)] = {
      ...place.type ? { $type: place.type } : {},
      $value: place.value,
      $extensions: {
        [EXTENSION]: {
          source: token.source,
          uses: token.uses,
          ...token.variable ? { variable: token.variable } : {},
          ...token.dark ? { dark: token.dark } : {},
          ...token.usedAs ? { usedAs: token.usedAs } : {},
          ...token.aliases ? { aliases: token.aliases } : {}
        }
      }
    };
  }
  return `${JSON.stringify(root, null, 2)}
`;
}
function tokensCss(tokens) {
  const lines = [
    `/* Design tokens read from ${readFrom(tokens)} by Page Scanner. */`,
    ...tokens.unusedDeclared > 0 ? [
      `/* ${tokens.unusedDeclared} declared colors nothing is drawn in are left out; extract.json has them. */`
    ] : [],
    ":root {",
    ...tokens.tokens.map((token) => `  ${propertyOf(token)}: ${token.value};`),
    "}"
  ];
  const dark = tokens.tokens.filter((token) => token.dark);
  if (dark.length > 0) {
    lines.push("", "@media (prefers-color-scheme: dark) {", "  :root {", ...dark.map((token) => `    ${propertyOf(token)}: ${token.dark};`), "  }", "}");
  }
  return `${lines.join("\n")}
`;
}
var TAILWIND_KEYS = {
  color: "colors",
  fontFamily: "fontFamily",
  fontSize: "fontSize",
  fontWeight: "fontWeight",
  lineHeight: "lineHeight",
  letterSpacing: "letterSpacing",
  space: "spacing",
  radius: "borderRadius",
  shadow: "boxShadow",
  duration: "transitionDuration",
  easing: "transitionTimingFunction",
  breakpoint: "screens"
};
function tailwindPreset(tokens) {
  const extend = {};
  for (const token of tokens.tokens) {
    const key = TAILWIND_KEYS[token.group];
    if (!key)
      continue;
    const value = token.group === "breakpoint" ? token.value : `var(${propertyOf(token)})`;
    (extend[key] ??= {})[tokenKey(token)] = value;
  }
  return [
    `// Design tokens read from ${readFrom(tokens)} by Page Scanner.`,
    "// Import tokens.css into the app as well: these values point at its custom properties.",
    `export default ${JSON.stringify({ theme: { extend } }, null, 2)};`,
    ""
  ].join("\n");
}
function designFiles(pages, { minUses = DEFAULT_MIN_USES } = {}) {
  const list = Array.isArray(pages) ? pages : [pages];
  const extract = mergeExtracts(list);
  const tokens = buildTokens(extract, minUses);
  if (list.length > 1)
    tokens.pages = list.map((page) => page.url);
  const audit = { ...auditScheme(extract.schemes.light), onePage: onePageValues(list) };
  const contrast = contrastReport(list.flatMap((page) => [
    page.schemes.light,
    ...tokens.darkDiffers ? [page.schemes.dark] : []
  ]));
  return {
    tokens,
    audit,
    contrast,
    files: {
      "tokens.json": tokensJson(tokens),
      "tokens.css": tokensCss(tokens),
      "tailwind.preset.js": tailwindPreset(tokens),
      "audit.md": auditMarkdown(tokens, audit),
      "contrast.md": contrastMarkdown(tokens, contrast),
      "extract.json": `${JSON.stringify({ pages: list }, null, 2)}
`
    }
  };
}

// node_modules/@page-scanner/cli/dist/design/components.js
var MAX_COMPONENTS = 40;
var MAX_VARIANTS = 8;
var CATALOG_MARGIN = 2;
var CONTROL_TAGS = /^(button|input|select|textarea)(:|$)/;
var NAMES = {
  button: "Button",
  a: "Link drawn as a button",
  select: "Select",
  textarea: "Text area",
  "input:text": "Text field",
  "input:email": "Email field",
  "input:search": "Search field",
  "input:password": "Password field",
  "input:checkbox": "Checkbox",
  "input:radio": "Radio button",
  "input:submit": "Submit button",
  "input:button": "Button"
};
function hex(value) {
  const color = parseColor(value);
  return color ? toHex(color) : value;
}
function normalizeStyle(style) {
  const out = { ...style };
  for (const key of ["background", "color", "borderColor"]) {
    if (out[key] !== void 0)
      out[key] = hex(out[key]);
  }
  return out;
}
function lookOf(style) {
  const border = style.borderStyle === "none" || Number.parseFloat(style.borderWidth) === 0 ? "none" : `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`;
  return [
    style.background,
    style.color,
    border,
    style.radius,
    style.padding,
    style.fontSize,
    style.fontWeight
  ].join("|");
}
function withoutWrappers(candidates) {
  const same = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;
  return candidates.filter((candidate, index) => !candidates.slice(index + 1).some((later) => same(candidate, later)));
}
function nameOf(tag, role, skeleton) {
  const inside = skeleton.replace(/\(.*?\)/g, "").split(",").filter(Boolean).slice(0, 4).join(", ");
  const holding = inside ? ` holding ${inside}` : "";
  if (role && role !== "button")
    return `${role[0].toUpperCase()}${role.slice(1)}${holding}`;
  if (NAMES[tag])
    return `${NAMES[tag]}${holding}`;
  if (role === "button")
    return `Button${holding}`;
  return `Box: ${tag}${holding}`;
}
function groupComponents(pages) {
  const first = pages[0]?.url ?? "";
  const groups = /* @__PURE__ */ new Map();
  for (const page of pages) {
    for (const candidate of withoutWrappers(page.components.candidates)) {
      const key = `${candidate.tag}|${candidate.role ?? ""}|${candidate.skeleton}`;
      const list = groups.get(key) ?? [];
      list.push({
        candidate,
        page: pageLabel(page.url, first),
        captureId: page.components.captureId
      });
      groups.set(key, list);
    }
  }
  const components = [];
  for (const instances of groups.values()) {
    const { tag, role, skeleton } = instances[0].candidate;
    const control = CONTROL_TAGS.test(tag) || role !== void 0;
    if (instances.length < (control ? 1 : 2))
      continue;
    const looks = /* @__PURE__ */ new Map();
    for (const instance of instances) {
      const key = lookOf(normalizeStyle(instance.candidate.style));
      looks.set(key, [...looks.get(key) ?? [], instance]);
    }
    const variants = [...looks.values()].sort((a, b) => b.length - a.length || (lookOf(a[0].candidate.style) < lookOf(b[0].candidate.style) ? -1 : 1)).slice(0, MAX_VARIANTS).map((members) => {
      const sample = members[0];
      const withStates = members.find((m) => m.candidate.hover || m.candidate.focus);
      const label = members.find((m) => m.candidate.label)?.candidate.label;
      return {
        instances: members.length,
        style: normalizeStyle(sample.candidate.style),
        ...withStates?.candidate.hover ? { hover: normalizeStyle(withStates.candidate.hover) } : {},
        ...withStates?.candidate.focus ? { focus: normalizeStyle(withStates.candidate.focus) } : {},
        disabled: members.filter((m) => m.candidate.disabled).length,
        // The catalog is set in a standard PDF font, which has Latin-1 only.
        ...label && [...label].every((ch) => ch.codePointAt(0) <= 255) ? { label } : {},
        sample: {
          page: sample.page,
          x: Math.round(sample.candidate.x),
          y: Math.round(sample.candidate.y),
          width: Math.round(sample.candidate.width),
          height: Math.round(sample.candidate.height)
        },
        captureId: sample.captureId
      };
    });
    const classCounts = /* @__PURE__ */ new Map();
    for (const { candidate } of instances) {
      classCounts.set(candidate.classes, (classCounts.get(candidate.classes) ?? 0) + 1);
    }
    const classes = [...classCounts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    components.push({
      name: nameOf(tag, role, skeleton),
      tag,
      ...role ? { role } : {},
      skeleton,
      classes,
      instances: instances.length,
      pages: [...new Set(instances.map((instance) => instance.page))],
      variants
    });
  }
  return components.sort((a, b) => b.instances - a.instances || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || (a.skeleton < b.skeleton ? -1 : 1)).slice(0, MAX_COMPONENTS).map((component2, index) => ({ id: `component-${index + 1}`, ...component2 }));
}
function describeLook(style) {
  const parts2 = [];
  if (style.background && !/^#[0-9a-f]{6}00$/.test(style.background)) {
    parts2.push(`bg ${style.background}`);
  }
  if (style.color)
    parts2.push(`text ${style.color}`);
  const drawn = style.borderStyle !== "none" && style.borderWidth !== "0px";
  if (drawn && (style.borderWidth || style.borderColor)) {
    parts2.push(`border ${[style.borderWidth, style.borderColor].filter(Boolean).join(" ")}`);
  }
  if (style.radius && style.radius !== "0px")
    parts2.push(`radius ${style.radius}`);
  if (style.padding && style.padding !== "0px 0px 0px 0px")
    parts2.push(`padding ${style.padding}`);
  if (style.fontSize || style.fontWeight) {
    parts2.push(`${style.fontSize ?? ""}${style.fontWeight ? `/${style.fontWeight}` : ""}`);
  }
  if (style.fontFamily)
    parts2.push(style.fontFamily);
  if (style.shadow && style.shadow !== "none")
    parts2.push("shadow");
  return parts2.join(" \xB7 ");
}
function componentsJson(pages, components) {
  return `${JSON.stringify({
    pages,
    components: components.map((component2) => ({
      ...component2,
      variants: component2.variants.map((variant) => {
        const kept = { ...variant };
        delete kept.captureId;
        return kept;
      })
    }))
  }, null, 2)}
`;
}
function componentsMarkdown(source2, components) {
  const lines = [
    "# Components",
    "",
    `Read from ${source2} by Page Scanner. Each is a structure repeated on the pages, or a control; each variant is its instances that look the same. States were read by forcing \`:hover\` and \`:focus-visible\` on one instance.`,
    ""
  ];
  if (components.length === 0)
    lines.push("No component was found.", "");
  for (const component2 of components) {
    lines.push(`## ${component2.name}`, "", `${component2.instances} ${component2.instances === 1 ? "instance" : "instances"} on ${component2.pages.join(", ")}. \`${component2.tag}\`${component2.role ? ` role \`${component2.role}\`` : ""}${component2.skeleton ? ` holding \`${component2.skeleton}\`` : ""}${component2.classes ? `, classes \`${component2.classes}\`` : ""}.`, "", "| Variant | Uses | Look | Hover | Focus |", "| --- | --- | --- | --- | --- |");
    component2.variants.forEach((variant, index) => {
      const cells = [
        `${index + 1}${variant.label ? ` "${variant.label.replace(/\|/g, "/")}"` : ""}${variant.disabled ? `, ${variant.disabled} disabled` : ""}`,
        String(variant.instances),
        describeLook(variant.style),
        variant.hover ? describeLook(variant.hover) : "",
        variant.focus ? describeLook(variant.focus) : ""
      ];
      lines.push(`| ${cells.join(" | ")} |`);
    });
    lines.push("");
  }
  return lines.join("\n");
}
function catalogSections(components) {
  return components.map((component2) => ({
    title: `${component2.name} (${component2.instances})`.slice(0, 200),
    lines: [
      `Found on ${component2.pages.slice(0, 6).join(", ")}${component2.pages.length > 6 ? ` and ${component2.pages.length - 6} more` : ""}.`
    ],
    items: component2.variants.map((variant, index) => ({
      captureId: variant.captureId,
      // A margin round the box, so a border on its edge is not cut by the clip.
      x: Math.max(0, variant.sample.x - CATALOG_MARGIN),
      y: Math.max(0, variant.sample.y - CATALOG_MARGIN),
      width: Math.max(1, variant.sample.width) + CATALOG_MARGIN * 2,
      height: Math.max(1, variant.sample.height) + CATALOG_MARGIN * 2,
      lines: [
        `Variant ${index + 1}: ${variant.instances} ${variant.instances === 1 ? "use" : "uses"}${variant.label ? `, "${variant.label}"` : ""}${variant.disabled ? `, ${variant.disabled} disabled` : ""}`,
        describeLook(variant.style),
        ...variant.hover ? [`hover: ${describeLook(variant.hover)}`] : [],
        ...variant.focus ? [`focus: ${describeLook(variant.focus)}`] : []
      ].slice(0, 16).map((line2) => line2.slice(0, 200))
    }))
  }));
}

// node_modules/@page-scanner/cli/dist/api.js
import { join as pathJoin, resolve as pathResolve } from "node:path";

// node_modules/@page-scanner/cli/dist/native/install.js
init_config();
init_errors();
init_protocol();
import { spawnSync } from "node:child_process";
import { chmodSync as chmodSync3, copyFileSync, existsSync as existsSync2, mkdirSync as mkdirSync4, readdirSync, readFileSync as readFileSync4, rmSync as rmSync2, writeFileSync as writeFileSync4 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname as dirname3, isAbsolute, join as join5, win32 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var STORE_EXTENSION_ID = "oinkohacnbkapdnnhpidmoidmidlgaoj";
var EXTENSION_ID = /^[a-p]{32}$/;
function currentPlatform() {
  return {
    os: process.platform,
    home: homedir3(),
    ...process.env.LOCALAPPDATA ? { localAppData: process.env.LOCALAPPDATA } : {}
  };
}
var MAC_BROWSERS = [
  ["chrome", "Google Chrome", "Google/Chrome"],
  ["chrome-beta", "Google Chrome Beta", "Google/Chrome Beta"],
  ["chrome-dev", "Google Chrome Dev", "Google/Chrome Dev"],
  ["chrome-canary", "Google Chrome Canary", "Google/Chrome Canary"],
  ["chrome-for-testing", "Chrome for Testing", "Google/Chrome for Testing"],
  ["chromium", "Chromium", "Chromium"],
  ["edge", "Microsoft Edge", "Microsoft Edge"],
  ["edge-beta", "Microsoft Edge Beta", "Microsoft Edge Beta"],
  ["edge-dev", "Microsoft Edge Dev", "Microsoft Edge Dev"],
  ["edge-canary", "Microsoft Edge Canary", "Microsoft Edge Canary"],
  ["brave", "Brave", "BraveSoftware/Brave-Browser"],
  ["arc", "Arc", "Arc/User Data"],
  ["vivaldi", "Vivaldi", "Vivaldi"]
];
var LINUX_BROWSERS = [
  ["chrome", "Google Chrome", "google-chrome"],
  ["chrome-beta", "Google Chrome Beta", "google-chrome-beta"],
  ["chrome-dev", "Google Chrome Dev", "google-chrome-unstable"],
  ["chromium", "Chromium", "chromium"],
  ["edge", "Microsoft Edge", "microsoft-edge"],
  ["edge-beta", "Microsoft Edge Beta", "microsoft-edge-beta"],
  ["edge-dev", "Microsoft Edge Dev", "microsoft-edge-dev"],
  ["brave", "Brave", "BraveSoftware/Brave-Browser"],
  ["vivaldi", "Vivaldi", "vivaldi"]
];
var WINDOWS_BROWSERS = [
  ["chrome", "Google Chrome", "Google\\Chrome\\User Data", "Google\\Chrome"],
  ["chromium", "Chromium", "Chromium\\User Data", "Chromium"],
  ["edge", "Microsoft Edge", "Microsoft\\Edge\\User Data", "Microsoft\\Edge"],
  ["brave", "Brave", "BraveSoftware\\Brave-Browser\\User Data", "BraveSoftware\\Brave-Browser"]
];
function knownBrowsers(platform = currentPlatform()) {
  if (platform.os === "win32") {
    const base2 = platform.localAppData ?? win32.join(platform.home, "AppData", "Local");
    return WINDOWS_BROWSERS.map(([id, name, data, key]) => ({
      id,
      name,
      dataDir: win32.join(base2, data),
      registryKey: `HKCU\\Software\\${key}\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`
    }));
  }
  const [base, table2] = platform.os === "darwin" ? [join5(platform.home, "Library", "Application Support"), MAC_BROWSERS] : [join5(platform.home, ".config"), LINUX_BROWSERS];
  return table2.map(([id, name, dir]) => ({
    id,
    name,
    dataDir: join5(base, dir),
    manifestDir: join5(base, dir, "NativeMessagingHosts")
  }));
}
function customTarget(dir, index) {
  return {
    id: `dir-${String(index + 1)}`,
    name: dir,
    dataDir: dir,
    manifestDir: join5(dir, "NativeMessagingHosts")
  };
}
function nativeHostDir() {
  return join5(configDir(), "native-host");
}
function wrapperPath(os = process.platform) {
  return join5(nativeHostDir(), os === "win32" ? "page-scanner-host.bat" : "page-scanner-host");
}
function hostCopyPath(source2) {
  return join5(nativeHostDir(), source2?.endsWith(".ts") ? "host.mts" : "host.mjs");
}
function installedHostPath() {
  for (const name of ["host.mjs", "host.mts"]) {
    const path = join5(nativeHostDir(), name);
    if (existsSync2(path))
      return path;
  }
  return null;
}
function windowsManifestPath() {
  return join5(nativeHostDir(), `${NATIVE_HOST_NAME}.json`);
}
function packagedHostPath() {
  const here = dirname3(fileURLToPath2(import.meta.url));
  const candidates = ["host.js", join5("native", "host.js"), "host.ts"].map((name) => join5(here, name));
  return candidates.find((candidate) => existsSync2(candidate)) ?? candidates[0];
}
function hostManifest(path, extensionIds) {
  return {
    name: NATIVE_HOST_NAME,
    description: "Page Scanner: lets an AI agent on this computer ask the extension for a scan",
    path,
    type: "stdio",
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`)
  };
}
var shellQuote = (value) => `'${value.replace(/'/g, "'\\''")}'`;
function wrapperScript(options) {
  if (options.os === "win32") {
    return [
      "@echo off",
      "rem Written by `page-scanner install`. Chrome runs this to start Page Scanner's helper.",
      `set "PAGE_SCANNER_HOME=${options.home}"`,
      ...options.electron ? ['set "ELECTRON_RUN_AS_NODE=1"'] : [],
      `"${options.node}" "${options.host}" %*`,
      ""
    ].join("\r\n");
  }
  return [
    "#!/bin/sh",
    "# Written by `page-scanner install`. Chrome runs this to start Page Scanner's helper,",
    "# which connects the extension to an agent on this computer. Run install again to rewrite it.",
    `PAGE_SCANNER_HOME=${shellQuote(options.home)}`,
    "export PAGE_SCANNER_HOME",
    ...options.electron ? ["ELECTRON_RUN_AS_NODE=1", "export ELECTRON_RUN_AS_NODE"] : [],
    `exec ${shellQuote(options.node)} ${shellQuote(options.host)} "$@"`,
    ""
  ].join("\n");
}
var UNPACKED = 4;
function readJson(path) {
  try {
    const value = JSON.parse(readFileSync4(path, "utf8"));
    return value !== null && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
function isPageScannerBuild(dir) {
  const manifest = readJson(join5(dir, "manifest.json"));
  let name = manifest?.name;
  const key = typeof name === "string" ? /^__MSG_(\w+)__$/.exec(name)?.[1] : void 0;
  if (key) {
    const locale = typeof manifest?.default_locale === "string" ? manifest.default_locale : "en";
    const messages = readJson(join5(dir, "_locales", locale, "messages.json"));
    const entry = messages?.[key] ?? messages?.[key.toLowerCase()];
    name = entry?.message;
  }
  return typeof name === "string" && /^Page Scanner\b/.test(name);
}
function profilesOf(dataDir) {
  try {
    return readdirSync(dataDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync2(join5(dataDir, entry.name, "Secure Preferences"))).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}
function findUnpackedCopies(target) {
  const found = [];
  for (const profile of profilesOf(target.dataDir)) {
    for (const file of ["Secure Preferences", "Preferences"]) {
      const prefs = readJson(join5(target.dataDir, profile, file));
      const settings = prefs?.extensions?.settings;
      for (const [id, raw] of Object.entries(settings ?? {})) {
        const entry = raw;
        if (!EXTENSION_ID.test(id) || entry.location !== UNPACKED)
          continue;
        if (typeof entry.path !== "string" || !isAbsolute(entry.path))
          continue;
        if (found.some((copy) => copy.id === id && copy.profile === profile))
          continue;
        if (!isPageScannerBuild(entry.path))
          continue;
        found.push({ browser: target.name, profile, id, path: entry.path });
      }
    }
  }
  return found;
}
function runReg(args) {
  const result = spawnSync("reg", args, { encoding: "utf8", windowsHide: true });
  return { status: result.status, stderr: result.stderr };
}
function checkIds(ids) {
  for (const id of ids) {
    if (!EXTENSION_ID.test(id)) {
      throw new PageScannerError("BAD_REQUEST", `--extension-id must be 32 letters from a to p (got ${JSON.stringify(id)}).`, "chrome://extensions shows the id under the extension, with Developer mode on.");
    }
  }
  return [.../* @__PURE__ */ new Set([STORE_EXTENSION_ID, ...ids])];
}
function targetsFor(platform, dirs, exists) {
  if (dirs.length > 0)
    return dirs.map(customTarget);
  const known = knownBrowsers(platform);
  const found = known.filter((browser) => exists(browser.dataDir));
  return found.length > 0 ? found : known.slice(0, 1);
}
function installNativeHost(options = {}) {
  const platform = options.platform ?? currentPlatform();
  const extensionIds = checkIds(options.extensionIds ?? []);
  const source2 = options.hostSource ?? packagedHostPath();
  if (!existsSync2(source2)) {
    throw new PageScannerError("BAD_REQUEST", `This copy of page-scanner has no native host to install (${source2}).`, "Run `npx @page-scanner/cli install`, which fetches one that does.");
  }
  ensureConfig();
  mkdirSync4(nativeHostDir(), { recursive: true, mode: 448 });
  rmSync2(join5(nativeHostDir(), source2.endsWith(".ts") ? "host.mjs" : "host.mts"), { force: true });
  copyFileSync(source2, hostCopyPath(source2));
  const wrapper = wrapperPath(platform.os);
  const node = options.node ?? process.execPath;
  writeFileSync4(wrapper, wrapperScript({
    os: platform.os,
    node,
    host: hostCopyPath(source2),
    home: configDir(),
    electron: options.node === void 0 && process.versions.electron !== void 0
  }), { mode: 448 });
  if (platform.os !== "win32")
    chmodSync3(wrapper, 448);
  const targets = targetsFor(platform, options.browserDirs ?? [], options.exists ?? existsSync2);
  const found = targets.flatMap(findUnpackedCopies);
  const allowed = [.../* @__PURE__ */ new Set([...extensionIds, ...found.map((copy) => copy.id)])];
  const manifest = `${JSON.stringify(hostManifest(wrapper, allowed), null, 2)}
`;
  const browsers = [];
  const reg = options.runRegistry ?? runReg;
  for (const target of targets) {
    if (target.registryKey) {
      writeFileSync4(windowsManifestPath(), manifest);
      const result = reg([
        "add",
        target.registryKey,
        "/ve",
        "/t",
        "REG_SZ",
        "/d",
        windowsManifestPath(),
        "/f"
      ]);
      if (result.status !== 0) {
        throw new PageScannerError("BAD_REQUEST", `Could not write ${target.registryKey}: ${result.stderr.trim() || "reg.exe failed"}.`);
      }
      browsers.push({
        id: target.id,
        name: target.name,
        manifestPath: windowsManifestPath(),
        registryKey: target.registryKey
      });
      continue;
    }
    const dir = target.manifestDir ?? join5(target.dataDir, "NativeMessagingHosts");
    mkdirSync4(dir, { recursive: true });
    const path = join5(dir, `${NATIVE_HOST_NAME}.json`);
    writeFileSync4(path, manifest);
    browsers.push({ id: target.id, name: target.name, manifestPath: path });
  }
  return {
    hostName: NATIVE_HOST_NAME,
    wrapperPath: wrapper,
    node,
    hostPath: hostCopyPath(source2),
    configPath: join5(configDir(), "config.json"),
    extensionIds: allowed,
    browsers,
    found
  };
}
function uninstallNativeHost(options = {}) {
  const platform = options.platform ?? currentPlatform();
  const removed = [];
  const reg = options.runRegistry ?? runReg;
  const targets = [...knownBrowsers(platform), ...(options.browserDirs ?? []).map(customTarget)];
  for (const target of targets) {
    if (target.registryKey) {
      if (reg(["delete", target.registryKey, "/f"]).status === 0)
        removed.push(target.registryKey);
      continue;
    }
    const path = join5(target.manifestDir ?? join5(target.dataDir, "NativeMessagingHosts"), `${NATIVE_HOST_NAME}.json`);
    if (existsSync2(path)) {
      rmSync2(path, { force: true });
      removed.push(path);
    }
  }
  if (existsSync2(nativeHostDir())) {
    rmSync2(nativeHostDir(), { recursive: true, force: true });
    removed.push(nativeHostDir());
  }
  return { removed };
}
function nativeHostReport(platform = currentPlatform()) {
  const wrapper = wrapperPath(platform.os);
  const browsers = knownBrowsers(platform).filter((browser) => browser.manifestDir !== void 0 && existsSync2(browser.dataDir)).map((browser) => {
    const manifestPath = join5(browser.manifestDir ?? "", `${NATIVE_HOST_NAME}.json`);
    let installed = false;
    let allowsStore = false;
    try {
      const manifest = JSON.parse(readFileSync4(manifestPath, "utf8"));
      installed = manifest.path === wrapper;
      allowsStore = Array.isArray(manifest.allowed_origins) && manifest.allowed_origins.includes(`chrome-extension://${STORE_EXTENSION_ID}/`);
    } catch {
    }
    return { id: browser.id, name: browser.name, manifestPath, installed, allowsStore };
  });
  let node = null;
  try {
    node = wrapperNode(readFileSync4(wrapper, "utf8"), platform.os);
  } catch {
  }
  return {
    hostInstalled: existsSync2(wrapper) && installedHostPath() !== null,
    wrapperPath: wrapper,
    node,
    nodeFound: node !== null && existsSync2(node),
    browsers
  };
}
function wrapperNode(script, os) {
  if (os === "win32") {
    return /^"([^"]+)" "/m.exec(script)?.[1] ?? null;
  }
  const quoted = /^exec '((?:[^']|'\\'')*)' /m.exec(script)?.[1];
  return quoted === void 0 ? null : quoted.replace(/'\\''/g, "'");
}

// node_modules/@page-scanner/cli/dist/api.js
function requirePairing() {
  const config = readConfig();
  if (!config.token) {
    throw new PageScannerError("NOT_PAIRED", "Page Scanner is not set up on this machine.", `Run \`${INSTALL_COMMAND}\`, then press Connect in the extension's settings, Local agents.`);
  }
  return config;
}
async function pair(options = {}) {
  const previous = readDaemonState();
  if (previous)
    await stopDaemon().catch(() => void 0);
  const config = ensureConfig({
    ...options.port !== void 0 ? { port: options.port } : {},
    rotate: options.rotate ?? false
  });
  return {
    ...config,
    configPath: configPath(),
    ownerOnly: configFileIsOwnerOnly()
  };
}
async function listBrowsers(options = {}) {
  requirePairing();
  const daemon = await connectDaemon(options);
  const answer = await daemon.call("listBrowsers");
  return answer.browsers;
}
async function waitForBrowser(options = {}) {
  requirePairing();
  const daemon = await connectDaemon(options);
  const waitMs = Math.round((options.waitSeconds ?? 30) * 1e3);
  return daemon.call("waitForBrowser", {
    ...options.browser !== void 0 ? { browserId: options.browser } : {},
    timeoutMs: waitMs
  }, waitMs + 3e4);
}
async function listTabs(options = {}) {
  requirePairing();
  const daemon = await connectDaemon(options);
  const waitMs = Math.round((options.waitSeconds ?? 30) * 1e3);
  return daemon.call("listTabs", {
    ...options.browser !== void 0 ? { browserId: options.browser } : {},
    timeoutMs: waitMs
  }, waitMs + 3e4);
}
function checkOutput(options, files) {
  if (options.name !== void 0)
    checkNameTemplate(options.name);
  if (options.out !== void 0 && outputNamesAFile(options.out, options.cwd)) {
    if (options.name !== void 0) {
      throw new PageScannerError("BAD_REQUEST", `--out ${JSON.stringify(options.out)} names a file, so there is nothing for --name to name.`, "Give --out a directory (end it with a slash if it does not exist yet).");
    }
    if (files > 1) {
      throw new PageScannerError("BAD_REQUEST", `--out ${JSON.stringify(options.out)} names one file, and this scans ${files} pages.`, "Give --out a directory (end it with a slash if it does not exist yet).");
    }
  }
}
function deliver(answer, target, options) {
  const mode = options.markdown;
  if (mode !== void 0 && !answer.structured) {
    throw new PageScannerError("SCAN_FAILED", "This version of Page Scanner in Chrome does not send the page\u2019s text.", "Update the extension (chrome://extensions, then Update), and scan again.");
  }
  const text = answer.structured;
  const page = text && {
    title: text.title,
    url: text.url,
    capturedAt: new Date(text.capturedAt).toISOString(),
    language: text.language,
    headings: text.headings
  };
  if (mode === "only" && text && page) {
    writeTextFile(target, text.markdown);
    page.markdownPath = target;
  } else {
    writeScanFile(target, answer.bytesBase64);
    if (mode === "beside" && text && page) {
      page.markdownPath = withExtension(target, "md");
      writeTextFile(page.markdownPath, text.markdown);
    }
    if (mode === "inline" && text && page)
      page.markdown = text.markdown;
  }
  return {
    path: target,
    width: answer.width,
    height: answer.height,
    mode: answer.mode,
    selectableText: mode !== "only" && answer.mode === "vector" && (options.format ?? "pdf") === "pdf",
    truncated: answer.truncated,
    browserId: answer.browserId,
    fileName: answer.fileName,
    ...page ? { page } : {},
    ...answer.hidden ? { hidden: answer.hidden } : {}
  };
}
async function scan(options) {
  requirePairing();
  if (options.url === void 0 === (options.tabId === void 0)) {
    throw new PageScannerError("BAD_REQUEST", "Give exactly one of url and tabId.");
  }
  checkOutput(options, 1);
  const answer = await requestScan(options);
  const name = options.name === void 0 ? answer.fileName : fillNameTemplate(options.name, {
    index: 1,
    count: 1,
    url: options.url ?? "",
    suggested: answer.fileName,
    startedAt: /* @__PURE__ */ new Date()
  });
  const target = resolveOutputPath(options.out, name, options.cwd);
  return deliver(answer, target, options);
}
async function scanMany(urls, options = {}) {
  requirePairing();
  checkBatch(urls, options);
  const { onItem, ...scanOptions } = options;
  const startedAt = /* @__PURE__ */ new Date();
  const taken = /* @__PURE__ */ new Set();
  const result = { results: [], written: 0, failed: 0 };
  for (const [index, url] of urls.entries()) {
    let item;
    try {
      const answer = await requestScan({ ...scanOptions, url });
      const name = uniqueName(options.name === void 0 ? answer.fileName : fillNameTemplate(options.name, {
        index: index + 1,
        count: urls.length,
        url,
        suggested: answer.fileName,
        startedAt
      }), taken);
      const target = resolveOutputPath(options.out, name, options.cwd);
      item = { url, ok: true, ...deliver(answer, target, scanOptions) };
      result.written += 1;
    } catch (thrown) {
      const error = toPageScannerError(thrown);
      const reason = {
        code: error.code,
        message: error.message,
        ...error.hint !== void 0 ? { hint: error.hint } : {}
      };
      if (endsTheBatch(error)) {
        result.stopped = reason;
        break;
      }
      item = { url, ok: false, error: reason };
      result.failed += 1;
    }
    result.results.push(item);
    onItem?.(item, index);
  }
  return result;
}
function checkBatch(urls, options) {
  if (urls.length === 0)
    throw new PageScannerError("BAD_REQUEST", "The list has no addresses.");
  if (urls.length > MAX_BATCH_URLS) {
    throw new PageScannerError("BAD_REQUEST", `The list has ${urls.length} addresses; one run takes up to ${MAX_BATCH_URLS}.`);
  }
  checkOutput(options, urls.length);
}
async function requestScan(options) {
  const waitMs = Math.round((options.waitSeconds ?? 30) * 1e3);
  const scanMs = Math.round((options.timeoutSeconds ?? 120) * 1e3);
  const daemon = await connectDaemon(options);
  return daemon.call("scan", {
    ...options.browser !== void 0 ? { browserId: options.browser } : {},
    ...options.url !== void 0 ? { url: options.url } : {},
    ...options.tabId !== void 0 ? { tabId: options.tabId } : {},
    ...options.windowId !== void 0 ? { windowId: options.windowId } : {},
    format: options.format ?? "pdf",
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    ...options.quality !== void 0 ? { quality: options.quality } : {},
    ...options.videoHandling !== void 0 ? { videoHandling: options.videoHandling } : {},
    ...options.colorScheme !== void 0 ? { colorScheme: options.colorScheme } : {},
    ...options.captureWidth !== void 0 ? { captureWidth: options.captureWidth } : {},
    ...options.openEditor !== void 0 ? { openEditor: options.openEditor } : {},
    ...options.markdown !== void 0 ? { structured: options.markdown === "only" ? "only" : "alongside" } : {},
    ...options.hide !== void 0 ? { hide: options.hide } : {},
    timeoutMs: waitMs,
    scanTimeoutMs: scanMs
  }, waitMs + scanMs);
}
async function status() {
  const config = readConfig();
  const state = readDaemonState();
  let browsers = [];
  if (state) {
    try {
      const daemon = await connectDaemon({ startDaemon: () => void 0, startTimeoutMs: 0 });
      const answer = await daemon.call("listBrowsers");
      browsers = answer.browsers;
    } catch {
      browsers = [];
    }
  }
  return {
    version: CLI_VERSION,
    paired: config.token.length > 0,
    bridgePort: config.port,
    configPath: configPath(),
    configOwnerOnly: configFileIsOwnerOnly(),
    daemon: state ? { running: true, pid: state.pid, rpcPort: state.rpcPort, version: state.version } : { running: false },
    browsers,
    nativeHost: nativeHostReport()
  };
}
var MAX_DESIGN_PAGES = 50;
function designDirectoryName(url) {
  let host = "page";
  try {
    host = new URL(url).hostname.replace(/^www\./, "") || host;
  } catch {
  }
  return `design-${host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}
async function extractDesign(options) {
  requirePairing();
  const urls = [...options.urls ?? [], ...options.url !== void 0 ? [options.url] : []];
  const ways = [urls.length > 0, options.tabId !== void 0, options.crawl !== void 0];
  if (ways.filter(Boolean).length !== 1) {
    throw new PageScannerError("BAD_REQUEST", "Give one or more addresses, a tabId, or a start address to crawl from.");
  }
  if (options.crawl)
    checkCrawl(options.crawl);
  if (urls.length > MAX_DESIGN_PAGES) {
    throw new PageScannerError("BAD_REQUEST", `${urls.length} addresses is more than the ${MAX_DESIGN_PAGES} a design is read from.`);
  }
  const waitMs = Math.round((options.waitSeconds ?? 30) * 1e3);
  const scanMs = Math.round((options.timeoutSeconds ?? 120) * 1e3);
  const daemon = await connectDaemon(options);
  const componentsOf = /* @__PURE__ */ new Map();
  const read2 = async (target, links = false) => {
    const answer = await daemon.call(
      "extractDesign",
      {
        ...options.browser !== void 0 ? { browserId: options.browser } : {},
        ...target,
        ...links ? { links } : {},
        ...options.components ? { components: true } : {},
        ...options.windowId !== void 0 ? { windowId: options.windowId } : {},
        timeoutMs: waitMs,
        scanTimeoutMs: scanMs
      },
      // A page read for its components is scanned as well, which takes as long again.
      waitMs + scanMs * (options.components ? 2 : 1)
    );
    if (answer.components)
      componentsOf.set(answer.extract, answer.components);
    return answer;
  };
  const answered = (extract, url) => {
    if (typeof extract.status === "number" && extract.status >= 400) {
      throw new PageScannerError("SCAN_FAILED", `${url} answered ${extract.status}` + (extract.title ? ` ("${extract.title}")` : "") + ", so it was not read into the design.", "A site can refuse a browser it takes for automated. Open the address in Chrome to see what it shows.");
    }
    return extract;
  };
  const extracts = [];
  const pages = [];
  let browserId = "";
  let firstError;
  let crawled;
  if (options.crawl) {
    const { start, maxPages, maxDepth } = options.crawl;
    let robotsStatus = "none";
    const result = await crawl(start, async (url) => {
      const answer = await read2({ url }, true);
      if (answer.links === void 0)
        throw extensionCannotCrawl();
      browserId = answer.browserId;
      return {
        value: answered(answer.extract, url),
        links: answer.links,
        landed: answer.extract.url
      };
    }, {
      ...maxPages !== void 0 ? { maxPages } : {},
      ...maxDepth !== void 0 ? { maxDepth } : {},
      // For the origin the start page landed on, which is the one crawled.
      robots: async (origin) => {
        const robots = await fetchRobots(origin, options.fetcher);
        robotsStatus = robots.status;
        return robots.rules;
      },
      isFatal: (error) => error instanceof PageScannerError && (endsTheBatch(error) || error.message === extensionCannotCrawl().message),
      onPage: (page) => {
        const result2 = {
          url: page.url,
          ok: page.ok,
          ...page.message !== void 0 ? { message: page.message } : {},
          ...page.landed !== void 0 ? { landed: page.landed } : {},
          ...page.left !== void 0 ? { left: page.left } : {}
        };
        pages.push(result2);
        options.onPage?.(result2);
      }
    });
    for (const page of result.pages)
      if (page.ok)
        extracts.push(page.value);
    crawled = { robots: robotsStatus, skipped: result.skipped };
    if (extracts.length === 0) {
      const first = result.pages[0];
      if (first?.error !== void 0)
        throw toPageScannerError(first.error);
      throw new PageScannerError("SCAN_FAILED", first?.message ?? `Nothing could be read from ${start}.`);
    }
  }
  const targets = options.crawl ? [] : urls.length > 0 ? urls.map((url) => ({ url })) : [{ tabId: options.tabId }];
  for (const target of targets) {
    try {
      const answer = await read2(target);
      browserId = answer.browserId;
      extracts.push(answered(answer.extract, "url" in target ? target.url : answer.extract.url));
      pages.push({ url: answer.extract.url, ok: true });
      options.onPage?.(pages.at(-1));
    } catch (thrown) {
      const error = toPageScannerError(thrown);
      firstError ??= error;
      if (endsTheBatch(error) || targets.length === 1)
        throw error;
      pages.push({ url: "url" in target ? target.url : "", ok: false, message: error.message });
      options.onPage?.(pages.at(-1));
    }
  }
  if (extracts.length === 0)
    throw firstError;
  const { tokens, audit, contrast, files } = designFiles(extracts, {
    ...options.minUses !== void 0 ? { minUses: options.minUses } : {}
  });
  const cwd = options.cwd ?? process.cwd();
  const directory = pathResolve(cwd, options.out !== void 0 ? expandHome(options.out) : designDirectoryName(extracts[0].url));
  const written = {};
  for (const [name, text] of Object.entries(files)) {
    const path = pathJoin(directory, name);
    writeTextFile(path, text);
    written[name] = path;
  }
  let found;
  if (options.components) {
    const componentPages = extracts.flatMap((extract) => {
      const components2 = componentsOf.get(extract);
      return components2 ? [{ url: extract.url, components: components2 }] : [];
    });
    const components = groupComponents(componentPages);
    const source2 = readFrom(tokens);
    const text = {
      "components.json": componentsJson(componentPages.map((page) => page.url), components),
      "components.md": componentsMarkdown(source2, components)
    };
    for (const [name, value] of Object.entries(text)) {
      const path = pathJoin(directory, name);
      writeTextFile(path, value);
      written[name] = path;
    }
    if (components.length > 0) {
      const catalog = await daemon.call("designCatalog", {
        browserId,
        title: `Components of ${source2}`,
        sections: catalogSections(components),
        scanTimeoutMs: scanMs
      }, scanMs);
      const path = pathJoin(directory, "catalog.pdf");
      writeScanFile(path, catalog.bytesBase64);
      written["catalog.pdf"] = path;
    }
    found = {
      components: components.length,
      variants: components.reduce((sum, component2) => sum + component2.variants.length, 0)
    };
  }
  const byGroup = {};
  for (const token of tokens.tokens)
    byGroup[token.group] = (byGroup[token.group] ?? 0) + 1;
  return {
    browserId,
    url: extracts[0].url,
    pages,
    directory,
    files: written,
    tokens: byGroup,
    declared: tokens.tokens.filter((token) => token.source === "declared").length,
    unusedDeclared: tokens.unusedDeclared,
    contrast: {
      pairs: measuredPairs(contrast).length,
      failing: measuredPairs(contrast).filter((pair2) => !pair2.passesAA).length,
      overImage: contrast.length - measuredPairs(contrast).length
    },
    nearlyEqual: audit.near.length,
    onePage: audit.onePage?.length ?? 0,
    darkDiffers: tokens.darkDiffers,
    ...crawled ? { crawl: crawled } : {},
    ...found ? { components: found } : {}
  };
}
function extensionCannotCrawl() {
  return new PageScannerError("SCAN_FAILED", "This Page Scanner extension does not report a page's links, so it cannot crawl.", "Update the extension (chrome://extensions, then Update), and try again.");
}
function checkCrawl(options) {
  try {
    const url = new URL(options.start);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
  } catch {
    throw new PageScannerError("BAD_REQUEST", `${JSON.stringify(options.start)} is not a web address.`);
  }
  const { maxPages, maxDepth } = options;
  if (maxPages !== void 0 && !(Number.isInteger(maxPages) && maxPages >= 1 && maxPages <= MAX_CRAWL_PAGES)) {
    throw new PageScannerError("BAD_REQUEST", `A crawl reads 1 to ${MAX_CRAWL_PAGES} pages.`);
  }
  if (maxDepth !== void 0 && !(Number.isInteger(maxDepth) && maxDepth >= 0 && maxDepth <= MAX_CRAWL_DEPTH)) {
    throw new PageScannerError("BAD_REQUEST", `A crawl goes 0 to ${MAX_CRAWL_DEPTH} links deep.`);
  }
}

// node_modules/@page-scanner/cli/dist/cli/commands.js
init_errors();

// node_modules/@page-scanner/cli/dist/diff/index.js
init_errors();
import { existsSync as existsSync3, mkdirSync as mkdirSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync5 } from "node:fs";
import { basename as basename2, dirname as dirname4, extname as extname2, resolve as resolve2 } from "node:path";

// node_modules/@page-scanner/cli/dist/diff/image.js
var CELL = 8;
var TOLERANCE = 48;
var MERGE_GAP = 16;
var OUTLINE = [230, 40, 40, 255];
var OUTLINE_WIDTH = 3;
var OUTLINE_MARGIN = 3;
function differs(a, at, b, bt) {
  return Math.abs(a[at] - b[bt]) + Math.abs(a[at + 1] - b[bt + 1]) + Math.abs(a[at + 2] - b[bt + 2]) + Math.abs(a[at + 3] - b[bt + 3]) > TOLERANCE;
}
function near(a, b, gap) {
  return a.x - gap <= b.x + b.width && b.x - gap <= a.x + a.width && a.y - gap <= b.y + b.height && b.y - gap <= a.y + a.height;
}
function union(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y
  };
}
function mergeRegions(regions, gap = MERGE_GAP) {
  let merged = [...regions];
  for (let changed = true; changed; ) {
    changed = false;
    const next = [];
    for (const region of merged) {
      const into = next.findIndex((other) => near(other, region, gap));
      if (into === -1)
        next.push(region);
      else {
        next[into] = union(next[into], region);
        changed = true;
      }
    }
    merged = next;
  }
  return merged.sort((a, b) => a.y - b.y || a.x - b.x);
}
function diffImages(before, after) {
  const { width, height } = after;
  const columns = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const cells = new Uint8Array(columns * rows);
  let changedPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = x < before.width && y < before.height;
      if (!inside || differs(after.data, (y * width + x) * 4, before.data, (y * before.width + x) * 4)) {
        changedPixels++;
        cells[Math.floor(y / CELL) * columns + Math.floor(x / CELL)] = 1;
      }
    }
  }
  const regions = [];
  const seen = new Uint8Array(cells.length);
  for (let start = 0; start < cells.length; start++) {
    if (!cells[start] || seen[start])
      continue;
    let [left, top, right, bottom] = [columns, rows, 0, 0];
    const queue = [start];
    seen[start] = 1;
    while (queue.length > 0) {
      const cell = queue.pop();
      const cx = cell % columns;
      const cy = Math.floor(cell / columns);
      left = Math.min(left, cx);
      right = Math.max(right, cx);
      top = Math.min(top, cy);
      bottom = Math.max(bottom, cy);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows)
            continue;
          const next = ny * columns + nx;
          if (cells[next] && !seen[next]) {
            seen[next] = 1;
            queue.push(next);
          }
        }
      }
    }
    const x = left * CELL;
    const y = top * CELL;
    regions.push({
      x,
      y,
      width: Math.min(width, (right + 1) * CELL) - x,
      height: Math.min(height, (bottom + 1) * CELL) - y
    });
  }
  const merged = mergeRegions(regions);
  return {
    changedPixels,
    changedFraction: width * height > 0 ? changedPixels / (width * height) : 0,
    regions: merged,
    outlined: outline(after, merged)
  };
}
function outline(image, regions) {
  const data = Uint8Array.from(image.data);
  const paint = (x, y) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height)
      return;
    data.set(OUTLINE, (y * image.width + x) * 4);
  };
  for (const region of regions) {
    const left = region.x - OUTLINE_MARGIN - OUTLINE_WIDTH;
    const top = region.y - OUTLINE_MARGIN - OUTLINE_WIDTH;
    const right = region.x + region.width + OUTLINE_MARGIN + OUTLINE_WIDTH - 1;
    const bottom = region.y + region.height + OUTLINE_MARGIN + OUTLINE_WIDTH - 1;
    for (let band = 0; band < OUTLINE_WIDTH; band++) {
      for (let x = left; x <= right; x++) {
        paint(x, top + band);
        paint(x, bottom - band);
      }
      for (let y = top; y <= bottom; y++) {
        paint(left + band, y);
        paint(right - band, y);
      }
    }
  }
  return { width: image.width, height: image.height, data };
}

// node_modules/@page-scanner/cli/dist/diff/png.js
import { crc32, deflateSync, inflateSync } from "node:zlib";
var SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var PngError = class extends Error {
};
var CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function decodePng(bytes) {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new PngError("not a PNG file");
  }
  let width = 0;
  let height = 0;
  let colorType = -1;
  let palette = null;
  let transparency = null;
  const data = [];
  for (let at = 8; at + 8 <= buffer.length; ) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString("latin1", at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      colorType = body[9];
      const interlace = body[12];
      if (depth !== 8)
        throw new PngError(`a ${depth}-bit PNG, and only 8 bits a channel is read`);
      if (interlace !== 0)
        throw new PngError("an interlaced PNG, which is not read");
      if (CHANNELS[colorType] === void 0)
        throw new PngError(`PNG color type ${colorType}`);
    } else if (type === "PLTE")
      palette = body;
    else if (type === "tRNS")
      transparency = body;
    else if (type === "IDAT")
      data.push(body);
    else if (type === "IEND")
      break;
    at += 12 + length;
  }
  if (width === 0 || height === 0)
    throw new PngError("a PNG with no image header");
  const channels = CHANNELS[colorType];
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(data));
  if (raw.length < (stride + 1) * height)
    throw new PngError("a PNG whose image data is cut short");
  const rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const source2 = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[source2 + x];
      const left = x >= channels ? rows[row + x - channels] : 0;
      const up = y > 0 ? rows[row - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? rows[row - stride + x - channels] : 0;
      let out;
      switch (filter) {
        case 0:
          out = value;
          break;
        case 1:
          out = value + left;
          break;
        case 2:
          out = value + up;
          break;
        case 3:
          out = value + (left + up >> 1);
          break;
        case 4:
          out = value + paeth(left, up, upLeft);
          break;
        default:
          throw new PngError(`a PNG row with filter ${filter}`);
      }
      rows[row + x] = out & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const from = pixel * channels;
    const to = pixel * 4;
    switch (colorType) {
      case 0:
        rgba[to] = rgba[to + 1] = rgba[to + 2] = rows[from];
        rgba[to + 3] = 255;
        break;
      case 2:
        rgba[to] = rows[from];
        rgba[to + 1] = rows[from + 1];
        rgba[to + 2] = rows[from + 2];
        rgba[to + 3] = 255;
        break;
      case 3: {
        const index = rows[from];
        if (!palette)
          throw new PngError("a palette PNG with no palette");
        rgba[to] = palette[index * 3] ?? 0;
        rgba[to + 1] = palette[index * 3 + 1] ?? 0;
        rgba[to + 2] = palette[index * 3 + 2] ?? 0;
        rgba[to + 3] = transparency?.[index] ?? 255;
        break;
      }
      case 4:
        rgba[to] = rgba[to + 1] = rgba[to + 2] = rows[from];
        rgba[to + 3] = rows[from + 1];
        break;
      default:
        rgba.set(rows.subarray(from, from + 4), to);
    }
  }
  return { width, height, data: rgba };
}
function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "latin1");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, tail]);
}
function encodePng(image) {
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y++) {
    const out = y * (stride + 1);
    raw[out] = 2;
    for (let x = 0; x < stride; x++) {
      const value = image.data[y * stride + x];
      const up = y > 0 ? image.data[(y - 1) * stride + x] : 0;
      raw[out + 1 + x] = value - up & 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array())
  ]);
}

// node_modules/@page-scanner/cli/dist/diff/text.js
var MAX_EDIT_DISTANCE = 2e3;
var CONTEXT_LINES = 3;
function splitFrontMatter(text) {
  const normalized = text.replace(/\r\n?/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  if (!match)
    return { fields: {}, body: normalized };
  const fields = {};
  for (const line2 of match[1].split("\n")) {
    const colon = line2.indexOf(":");
    if (colon <= 0)
      continue;
    const raw = line2.slice(colon + 1).trim();
    let value = raw;
    if (raw.startsWith('"')) {
      try {
        value = String(JSON.parse(raw));
      } catch {
        value = raw;
      }
    }
    fields[line2.slice(0, colon).trim()] = value;
  }
  return { fields, body: normalized.slice(match[0].length) };
}
function diffLines(a, b) {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head])
    head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) {
    tail++;
  }
  const middle = myers(a.slice(head, a.length - tail), b.slice(head, b.length - tail));
  return [
    ...a.slice(0, head).map((text) => ({ op: " ", text })),
    ...middle,
    ...a.slice(a.length - tail).map((text) => ({ op: " ", text }))
  ];
}
function myers(a, b) {
  const n = a.length;
  const m = b.length;
  if (n === 0)
    return b.map((text) => ({ op: "+", text }));
  if (m === 0)
    return a.map((text) => ({ op: "-", text }));
  const ids = /* @__PURE__ */ new Map();
  const id = (line2) => {
    let value = ids.get(line2);
    if (value === void 0)
      ids.set(line2, value = ids.size);
    return value;
  };
  const x0 = a.map(id);
  const y0 = b.map(id);
  const limit = Math.min(n + m, MAX_EDIT_DISTANCE);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  const trace = [];
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || k !== d && v[offset + k - 1] < v[offset + k + 1] ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && x0[x] === y0[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice(offset - d, offset + d + 1));
        return walkBack(trace, a, b);
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  return [
    ...a.map((text) => ({ op: "-", text })),
    ...b.map((text) => ({ op: "+", text }))
  ];
}
function walkBack(trace, a, b) {
  const out = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d > 0; d--) {
    const previous = trace[d - 1];
    const at = (k2) => previous[k2 + d - 1];
    const k = x - y;
    const down = k === -d || k !== d && at(k - 1) < at(k + 1);
    const prevK = down ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      out.push({ op: " ", text: a[--x] });
      y--;
    }
    if (down)
      out.push({ op: "+", text: b[--y] });
    else
      out.push({ op: "-", text: a[--x] });
  }
  while (x > 0 && y > 0) {
    out.push({ op: " ", text: a[--x] });
    y--;
  }
  return out.reverse();
}
function toHunks(lines, context = CONTEXT_LINES) {
  const oldAt = [];
  const newAt = [];
  let oldLine = 1;
  let newLine = 1;
  for (const line2 of lines) {
    oldAt.push(oldLine);
    newAt.push(newLine);
    if (line2.op !== "+")
      oldLine++;
    if (line2.op !== "-")
      newLine++;
  }
  const groups = [];
  lines.forEach((line2, index) => {
    if (line2.op === " ")
      return;
    const last = groups[groups.length - 1];
    if (last && index - last[1] - 1 <= context * 2)
      last[1] = index;
    else
      groups.push([index, index]);
  });
  return groups.map(([first, last]) => {
    const start = Math.max(0, first - context);
    const slice = lines.slice(start, Math.min(lines.length, last + context + 1));
    return {
      oldStart: oldAt[start],
      oldLines: slice.filter((line2) => line2.op !== "+").length,
      newStart: newAt[start],
      newLines: slice.filter((line2) => line2.op !== "-").length,
      lines: slice
    };
  });
}
function diffText(before, after) {
  const lines = diffLines(splitFrontMatter(before).body.split("\n"), splitFrontMatter(after).body.split("\n"));
  return {
    added: lines.filter((line2) => line2.op === "+").length,
    removed: lines.filter((line2) => line2.op === "-").length,
    hunks: toHunks(lines)
  };
}
function formatUnified(diff, oldLabel, newLabel) {
  if (diff.hunks.length === 0)
    return "";
  const range = (start, count) => count === 1 ? `${start}` : `${count === 0 ? start - 1 : start},${count}`;
  return [
    `--- ${oldLabel}`,
    `+++ ${newLabel}`,
    ...diff.hunks.flatMap((hunk) => [
      `@@ -${range(hunk.oldStart, hunk.oldLines)} +${range(hunk.newStart, hunk.newLines)} @@`,
      ...hunk.lines.map((line2) => `${line2.op}${line2.text}`)
    ])
  ].join("\n");
}

// node_modules/@page-scanner/cli/dist/diff/index.js
function badRequest2(message, hint) {
  return new PageScannerError("BAD_REQUEST", message, hint);
}
function sideOf(path) {
  const extension2 = extname2(path).toLowerCase();
  if (extension2 === ".md" || extension2 === ".markdown")
    return { path, kind: "text" };
  if (extension2 === ".png")
    return { path, kind: "visual" };
  if (extension2 === ".pdf") {
    const beside = withExtension(path, "md");
    if (existsSync3(beside))
      return { path: beside, kind: "text" };
    throw badRequest2(`${basename2(path)} is a PDF, and there is no ${basename2(beside)} beside it to compare.`, "Scan with `--markdown beside` so each PDF has its text next to it, and diff those.");
  }
  if (extension2 === ".jpg" || extension2 === ".jpeg") {
    throw badRequest2(`${basename2(path)} is a JPEG, whose compression changes pixels on its own.`, "Scan with `--format png` to compare pictures, or `--markdown` to compare text.");
  }
  throw badRequest2(`${basename2(path)} is not a capture diff can read.`, "It compares two Markdown files (.md), two PNGs, or two PDFs with Markdown beside them.");
}
function read(path) {
  try {
    return readFileSync5(path);
  } catch (error) {
    throw badRequest2(`Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function textSide(path, text) {
  const { fields } = splitFrontMatter(text);
  return { path, source: fields.source ?? null, captured: fields.captured ?? null };
}
function diffCaptures(oldPath, newPath, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const before = sideOf(resolve2(cwd, oldPath));
  const after = sideOf(resolve2(cwd, newPath));
  if (before.kind !== after.kind) {
    throw badRequest2("The two captures are of different kinds: one is text and the other a picture.", "Compare two Markdown files, or two PNGs.");
  }
  if (before.kind === "text") {
    const oldText = read(before.path).toString("utf8");
    const newText = read(after.path).toString("utf8");
    const diff2 = diffText(oldText, newText);
    const old = textSide(before.path, oldText);
    const next = textSide(after.path, newText);
    return {
      kind: "text",
      changed: diff2.hunks.length > 0,
      old,
      new: next,
      sameAddress: old.source && next.source ? old.source === next.source : null,
      added: diff2.added,
      removed: diff2.removed,
      hunks: diff2.hunks,
      unified: formatUnified(diff2, before.path, after.path)
    };
  }
  let oldImage;
  let newImage;
  try {
    oldImage = decodePng(read(before.path));
    newImage = decodePng(read(after.path));
  } catch (error) {
    if (error instanceof PngError)
      throw badRequest2(`Could not read the PNG: ${error.message}.`);
    throw error;
  }
  const diff = diffImages(oldImage, newImage);
  const changed = diff.regions.length > 0;
  let path = null;
  if (changed) {
    path = options.out ? resolve2(cwd, options.out) : withExtension(after.path, "diff.png");
    mkdirSync5(dirname4(path), { recursive: true });
    writeFileSync5(path, encodePng(diff.outlined));
  }
  return {
    kind: "visual",
    changed,
    old: { path: before.path, width: oldImage.width, height: oldImage.height },
    new: { path: after.path, width: newImage.width, height: newImage.height },
    changedFraction: diff.changedFraction,
    regions: diff.regions,
    path
  };
}

// node_modules/@page-scanner/cli/dist/verify.js
init_errors();
import { createHash, webcrypto } from "node:crypto";
import { existsSync as existsSync4, readFileSync as readFileSync6 } from "node:fs";
import { resolve as resolve3 } from "node:path";
var RECORD_SUFFIX = ".integrity.json";
var RECORD_FORMAT = "page-scanner-integrity/1";
function canonicalJson(value) {
  if (Array.isArray(value))
    return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function badRequest3(message, hint) {
  return new PageScannerError("BAD_REQUEST", message, hint);
}
function readRecord(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync6(path, "utf8"));
  } catch (error) {
    throw badRequest3(`Could not read the record ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const record = parsed;
  if (!record || record.format !== RECORD_FORMAT || typeof record.file?.sha256 !== "string" || typeof record.file.bytes !== "number") {
    throw badRequest3(`${path} is not a Page Scanner integrity record.`);
  }
  return record;
}
async function signatureHolds(record) {
  const { signature, ...signed } = record;
  if (!signature || signature.algorithm !== "ES256")
    return false;
  try {
    const key = await webcrypto.subtle.importKey("jwk", {
      kty: signature.publicKey.kty,
      crv: signature.publicKey.crv,
      x: signature.publicKey.x,
      y: signature.publicKey.y
    }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const thumbprint = createHash("sha256").update(JSON.stringify({
      crv: signature.publicKey.crv,
      kty: signature.publicKey.kty,
      x: signature.publicKey.x,
      y: signature.publicKey.y
    })).digest("base64url");
    if (thumbprint !== signature.keyThumbprint)
      return false;
    return await webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(signature.value, "base64url"), Buffer.from(canonicalJson(signed), "utf8"));
  } catch {
    return false;
  }
}
async function verifyCapture(filePath, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const file = resolve3(cwd, filePath);
  const recordPath = resolve3(cwd, options.record ?? `${filePath}${RECORD_SUFFIX}`);
  if (!existsSync4(recordPath)) {
    throw badRequest3(`There is no record at ${recordPath}.`, "Name it with --record, or export with an integrity record beside the file.");
  }
  const record = readRecord(recordPath);
  let bytes;
  try {
    bytes = readFileSync6(file);
  } catch (error) {
    throw badRequest3(`Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const matches = sha256 === record.file.sha256.toLowerCase() && bytes.length === record.file.bytes;
  const signature = record.signature ? { valid: await signatureHolds(record), keyThumbprint: record.signature.keyThumbprint } : null;
  return {
    verified: matches && (signature === null || signature.valid),
    file: { path: file, matches, sha256, bytes: bytes.length },
    record: {
      path: recordPath,
      expectedSha256: record.file.sha256,
      expectedBytes: record.file.bytes,
      url: record.page?.url ?? null,
      captured: record.captured?.local ?? record.captured?.utc ?? null
    },
    signature
  };
}

// node_modules/@page-scanner/cli/dist/cli/format.js
var TITLE_WIDTH = 60;
function table(headers, rows) {
  if (rows.length === 0)
    return "";
  const columns = Math.max(headers.length, ...rows.map((row) => row.length));
  const widths = [];
  for (let index = 0; index < columns; index += 1) {
    let width = headers[index]?.length ?? 0;
    for (const row of rows)
      width = Math.max(width, row[index]?.length ?? 0);
    widths[index] = width;
  }
  const line2 = (cells) => {
    const padded = [];
    for (let index = 0; index < columns; index += 1) {
      const cell = cells[index] ?? "";
      padded.push(index === columns - 1 ? cell : cell.padEnd(widths[index] ?? 0));
    }
    return padded.join("  ").trimEnd();
  };
  const body = rows.map(line2);
  return headers.some((header) => header.length > 0) ? [line2(headers), ...body].join("\n") : body.join("\n");
}
function formatBrowsers(browsers) {
  if (browsers.length === 0)
    return "No browser is connected.";
  return table(["LABEL", "BROWSER ID", "VERSION", "CONNECTED"], browsers.map((browser) => [
    browser.label,
    browser.browserId,
    browser.extensionVersion,
    formatDuration(browser.connectedForMs)
  ]));
}
function formatTabs(windows, tabs) {
  if (windows.length === 0 && tabs.length === 0)
    return "No tabs are open.";
  const grouped = /* @__PURE__ */ new Map();
  for (const window of windows)
    grouped.set(window.windowId, []);
  for (const tab of tabs) {
    const group = grouped.get(tab.windowId);
    if (group)
      group.push(tab);
    else
      grouped.set(tab.windowId, [tab]);
  }
  const summaries = new Map(windows.map((window) => [window.windowId, window]));
  const blocks = [];
  for (const [windowId, group] of grouped) {
    const lines = [windowHeading(windowId, summaries.get(windowId), group.length)];
    const body = table(["", "TAB", "TITLE", "URL"], group.map((tab) => [
      tab.active ? "*" : "",
      String(tab.tabId),
      truncate(tab.title.trim() || "(untitled)", TITLE_WIDTH),
      // The URL is the last column and is never cut. It is the one cell a
      // person is likely to copy, and a shortened one is worse than a long
      // line the terminal wraps itself.
      tab.url
    ]));
    if (body)
      lines.push(body);
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}
function formatTruncation(report) {
  const measured = `${px3(report.requestedWidth)}x${px3(report.requestedHeight)}`;
  const captured = `${px3(report.width)}x${px3(report.height)}`;
  const head = `Truncated: the page measured ${measured} CSS px, captured ${captured}.`;
  const message = report.message.trim();
  return message ? `${head} ${message}` : head;
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0)
    return "0s";
  const total = Math.round(ms / 1e3);
  if (total < 60)
    return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60)
    return `${minutes}m ${pad2(total % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${pad2(minutes % 60)}m`;
}
function windowHeading(windowId, summary, shown) {
  const parts2 = [];
  if (summary?.focused)
    parts2.push("focused");
  if (summary && summary.windowType)
    parts2.push(summary.windowType);
  const count = summary?.tabCount ?? shown;
  parts2.push(count === 1 ? "1 tab" : `${count} tabs`);
  return `Window ${windowId} (${parts2.join(", ")})`;
}
function truncate(text, width) {
  const characters = Array.from(text);
  if (characters.length <= width)
    return text;
  return `${characters.slice(0, width - 1).join("").trimEnd()}\u2026`;
}
function px3(value) {
  return String(Math.round(value));
}
function pad2(value) {
  return String(value).padStart(2, "0");
}
function formatHidden(report) {
  const parts2 = [];
  const count = (n, one, many) => n === 1 ? `${/^[aeiou]/.test(one) ? "an" : "a"} ${one}` : `${n} ${many}`;
  if (report.ads > 0)
    parts2.push(count(report.ads, "ad", "ads"));
  if (report.consent > 0)
    parts2.push(count(report.consent, "consent banner", "consent banners"));
  if (report.chat > 0)
    parts2.push(count(report.chat, "chat widget", "chat widgets"));
  if (report.overlays > 0)
    parts2.push(count(report.overlays, "overlay", "overlays"));
  if (parts2.length === 0)
    return null;
  const list = parts2.length === 1 ? parts2[0] : `${parts2.slice(0, -1).join(", ")} and ${parts2.at(-1)}`;
  return `Hid ${list} before the capture.`;
}

// node_modules/@page-scanner/cli/dist/cli/commands.js
init_version();
function line(io2, text) {
  io2.stdout(`${text}
`);
}
function note(io2, text) {
  io2.stderr(`${text}
`);
}
function json(io2, payload) {
  io2.stdout(`${JSON.stringify(payload, null, 2)}
`);
}
async function warnIfWaiting(io2, waitSeconds, useJson) {
  if (useJson || waitSeconds <= 0)
    return;
  try {
    const browsers = await listBrowsers();
    if (browsers.length > 0)
      return;
  } catch {
    return;
  }
  note(io2, `Waiting up to ${waitSeconds}s for Chrome to connect. ${CONNECT_HINT}`);
}
function reportScan(io2, result, format, useJson) {
  if (useJson) {
    json(io2, { ok: true, ...result });
    return;
  }
  notesFor(io2, result, format);
  printPaths(io2, result);
}
function printPaths(io2, result) {
  line(io2, result.path);
  const markdown = result.page?.markdownPath;
  if (markdown && markdown !== result.path)
    line(io2, markdown);
}
function notesFor(io2, result, format) {
  if (result.truncated)
    note(io2, formatTruncation(result.truncated));
  const hidden = result.hidden && formatHidden(result.hidden);
  if (hidden)
    note(io2, hidden);
  if (result.mode === "raster" && result.page?.markdownPath !== result.path) {
    note(io2, format === "pdf" ? "Chrome would not attach its debugger, so this was stitched from screenshots: the PDF's text is an image, not text." : "Chrome would not attach its debugger, so this was stitched from screenshots.");
  }
}
function crawlNote(crawl2) {
  const reasons = [
    [crawl2.skipped.template, "a kind of page already read"],
    [crawl2.skipped.unsafe, "an address that acts (log out, delete)"],
    [crawl2.skipped.robots, "robots.txt"],
    [crawl2.skipped.depth, "deeper than --depth"],
    [crawl2.skipped.limit, "past --max-pages"],
    [crawl2.skipped.file, "a file"]
  ];
  const said = reasons.filter(([count]) => count > 0).map(([count, why]) => `${count} for ${why}`);
  const left = [
    [crawl2.skipped.elsewhere, "landing on another site"],
    [crawl2.skipped.duplicate, "landing on a kind of page already read"]
  ].filter(([count]) => count > 0).map(([count, why]) => `${count} for ${why}`);
  return (said.length > 0 ? `Links not followed: ${said.join(", ")}. ` : "") + (left.length > 0 ? `Pages left out: ${left.join(", ")}. ` : "") + (crawl2.robots === "unreachable" ? "robots.txt could not be read, so none was applied. " : "");
}
function describeDesignPage(page) {
  if (page.ok)
    return `Read ${page.url}` + (page.landed ? ` (landed on ${page.landed})` : "");
  if (page.left === "elsewhere") {
    let host = "another site";
    try {
      host = new URL(page.landed ?? "").host || host;
    } catch {
    }
    return `Left out ${page.url}: it went to ${host}`;
  }
  if (page.left === "duplicate") {
    return `Left out ${page.url}: it landed on ${page.landed}, a kind of page already read`;
  }
  return `Could not read ${page.url}: ${page.message}`;
}
function batchUrls(parsed, io2) {
  const urls = [...parsed.urls ?? []];
  if (parsed.urlsFile !== void 0) {
    let text;
    try {
      text = parsed.urlsFile === "-" ? (io2.stdin ?? (() => readFileSync7(0, "utf8")))() : readFileSync7(resolve4(parsed.urlsFile), "utf8");
    } catch (error) {
      throw new PageScannerError("BAD_REQUEST", `--urls could not read ${JSON.stringify(parsed.urlsFile)}: ${error instanceof Error ? error.message : String(error)}`);
    }
    urls.push(...readUrlList(text));
  }
  return urls;
}
async function runBatch(parsed, io2) {
  const urls = batchUrls(parsed, io2);
  checkBatch(urls, scanOptionsOf(parsed));
  await warnIfWaiting(io2, parsed.waitSeconds, parsed.json);
  const result = await scanMany(urls, {
    ...scanOptionsOf(parsed),
    onItem: (item) => {
      if (parsed.json)
        return;
      if (item.ok) {
        notesFor(io2, item, parsed.format);
        printPaths(io2, item);
      } else {
        note(io2, `Failed: ${item.url}: ${item.error.message}`);
      }
    }
  });
  const stoppedCode = result.stopped ? exitCodeFor(result.stopped.code) : 0;
  const code2 = stoppedCode || (result.failed > 0 ? 1 : 0);
  if (parsed.json) {
    json(io2, { ok: code2 === 0, count: urls.length, ...result });
    return code2;
  }
  if (result.stopped) {
    note(io2, result.stopped.message);
    if (result.stopped.hint)
      note(io2, result.stopped.hint);
  }
  const tried = result.results.length;
  note(io2, `Wrote ${result.written} of ${urls.length}` + (result.failed > 0 ? `; ${result.failed} failed` : "") + (result.stopped ? `; stopped with ${urls.length - tried} left` : "") + ".");
  return code2;
}
function reportDiff(io2, result, useJson) {
  const code2 = result.changed ? 1 : 0;
  if (useJson) {
    json(io2, { ok: true, ...result });
    return code2;
  }
  if (result.kind === "text") {
    if (result.sameAddress === false) {
      note(io2, `These are two different pages: ${result.old.source} and ${result.new.source}.`);
    }
    if (!result.changed) {
      note(io2, "No change in the text.");
      return code2;
    }
    line(io2, result.unified);
    note(io2, `${result.added} ${result.added === 1 ? "line" : "lines"} added, ${result.removed} removed.`);
    return code2;
  }
  if (!result.changed) {
    note(io2, "No change in the picture.");
    return code2;
  }
  if (result.path)
    line(io2, result.path);
  const percent = result.changedFraction * 100;
  note(io2, `${result.regions.length} ${result.regions.length === 1 ? "region" : "regions"} changed, ${percent < 0.1 ? "<0.1" : percent.toFixed(1)}% of the picture.` + (result.old.width !== result.new.width || result.old.height !== result.new.height ? ` The captures are ${result.old.width}x${result.old.height} and ${result.new.width}x${result.new.height} px.` : ""));
  return code2;
}
function reportVerify(io2, result, useJson) {
  const code2 = result.verified ? 0 : 1;
  if (useJson) {
    json(io2, { ok: true, ...result });
    return code2;
  }
  line(io2, result.file.matches ? `The file matches its record: SHA-256 ${result.file.sha256}, ${result.file.bytes} bytes.` : `The file does not match its record: SHA-256 ${result.file.sha256}, ${result.file.bytes} bytes, where the record has ${result.record.expectedSha256}, ${result.record.expectedBytes} bytes.`);
  if (result.signature === null)
    line(io2, "The record is not signed.");
  else if (result.signature.valid) {
    line(io2, `Signed by the key ${result.signature.keyThumbprint}, and the signature holds.`);
  } else
    line(io2, "The record\u2019s signature does not hold: the record was changed after it was signed.");
  if (result.record.captured || result.record.url) {
    line(io2, `It records ${result.record.url ?? "no address"}, captured ${result.record.captured ?? "at no stated time"} by the capturing computer\u2019s clock, which nothing here can confirm.`);
  }
  return code2;
}
function scanOptionsOf(parsed) {
  return {
    ...parsed.windowId !== void 0 ? { windowId: parsed.windowId } : {},
    ...parsed.browser !== void 0 ? { browser: parsed.browser } : {},
    ...parsed.quality !== void 0 ? { quality: parsed.quality } : {},
    ...parsed.videoHandling !== void 0 ? { videoHandling: parsed.videoHandling } : {},
    ...parsed.colorScheme !== void 0 ? { colorScheme: parsed.colorScheme } : {},
    ...parsed.captureWidth !== void 0 ? { captureWidth: parsed.captureWidth } : {},
    ...parsed.out !== void 0 ? { out: parsed.out } : {},
    ...parsed.name !== void 0 ? { name: parsed.name } : {},
    ...parsed.markdown !== void 0 ? { markdown: parsed.markdown } : {},
    ...parsed.hide !== void 0 ? { hide: parsed.hide } : {},
    format: parsed.format,
    pageSize: parsed.pageSize,
    openEditor: parsed.openEditor,
    waitSeconds: parsed.waitSeconds,
    timeoutSeconds: parsed.timeoutSeconds
  };
}
function checkNode(node) {
  if (!isAbsolute2(node)) {
    throw new PageScannerError("BAD_REQUEST", `--node needs an absolute path, not ${node}.`);
  }
  try {
    accessSync2(node, constants2.X_OK);
  } catch {
    throw new PageScannerError("BAD_REQUEST", `--node names ${node}, which is not there to run.`);
  }
}
function nativeHostLine(report) {
  const { nativeHost } = report;
  const ready = nativeHost.browsers.filter((browser) => browser.installed);
  if (!nativeHost.hostInstalled || ready.length === 0) {
    return `not set up, run \`${INSTALL_COMMAND}\``;
  }
  if (!nativeHost.nodeFound) {
    return `set up, but the Node it runs on is gone (${nativeHost.node ?? "unreadable"}), run \`${INSTALL_COMMAND}\` again`;
  }
  return `set up for ${ready.map((browser) => browser.name).join(", ")}`;
}
function reportStatus(io2, report, useJson) {
  if (useJson) {
    json(io2, { ok: true, ...report });
    return;
  }
  const rows = [
    `page-scanner   ${report.version}`,
    `pairing        ${report.paired ? `port ${report.bridgePort}` : `none, run \`${INSTALL_COMMAND}\``}`,
    `config         ${report.configPath}${report.configOwnerOnly ? "" : " (not owner-only on this platform)"}`,
    report.daemon.running ? `daemon         running, pid ${report.daemon.pid}, version ${report.daemon.version}` : "daemon         not running",
    `helper         ${nativeHostLine(report)}`
  ];
  for (const row of rows)
    line(io2, row);
  if (report.browsers.length === 0) {
    line(io2, "browsers       none connected");
    return;
  }
  line(io2, "browsers");
  for (const browser of report.browsers) {
    line(io2, `  ${browser.label} (${browser.browserId}) extension ${browser.extensionVersion}, connected ${formatDuration(browser.connectedForMs)}`);
  }
}
async function runCommand(parsed, io2) {
  try {
    switch (parsed.command) {
      case "help":
        line(io2, USAGE);
        return 0;
      case "version":
        line(io2, CLI_VERSION);
        return 0;
      case "install": {
        if (parsed.node !== void 0)
          checkNode(parsed.node);
        const result = installNativeHost({
          extensionIds: parsed.extensionIds,
          browserDirs: parsed.browserDirs,
          ...parsed.node !== void 0 ? { node: parsed.node } : {}
        });
        if (parsed.json) {
          json(io2, { ok: true, ...result });
          return 0;
        }
        line(io2, `Page Scanner's helper is set up for ${result.browsers.map((b) => b.name).join(", ")}.`);
        line(io2, "");
        line(io2, `  Helper    ${result.wrapperPath}`);
        line(io2, `  Node      ${result.node}`);
        for (const browser of result.browsers) {
          line(io2, `  ${browser.registryKey ? "Registry" : "Manifest"}  ${browser.registryKey ?? browser.manifestPath}`);
        }
        for (const copy of result.found) {
          line(io2, `  Unpacked  ${copy.id} in ${copy.browser} (${copy.profile}), ${copy.path}`);
        }
        line(io2, "");
        line(io2, "Now open Page Scanner's settings in Chrome, Local agents, and press Connect. Chrome asks once whether the extension may talk to the helper.");
        return 0;
      }
      case "uninstall": {
        const result = uninstallNativeHost({ browserDirs: parsed.browserDirs });
        if (parsed.json)
          json(io2, { ok: true, ...result });
        else if (result.removed.length === 0)
          note(io2, "Page Scanner's helper was not set up.");
        else
          for (const path of result.removed)
            line(io2, path);
        return 0;
      }
      case "pair": {
        const result = await pair({
          ...parsed.port !== void 0 ? { port: parsed.port } : {},
          rotate: parsed.rotate
        });
        if (parsed.json) {
          json(io2, { ok: true, ...result });
        } else {
          line(io2, "");
          line(io2, 'Paste these into Chrome: Page Scanner settings, "Local agents".');
          line(io2, "");
          line(io2, `  Port   ${result.port}`);
          line(io2, `  Token  ${result.token}`);
          line(io2, "");
          line(io2, `Saved to ${result.configPath}${result.ownerOnly ? " (owner-readable only)." : "."}`);
          if (!result.ownerOnly) {
            note(io2, "Windows does not enforce the owner-only mode this file is written with. On a shared machine, restrict it yourself: see the README.");
          }
          line(io2, "Name the browser too, so an agent can tell your profiles apart, then press Connect.");
        }
        if (parsed.waitSeconds > 0) {
          if (!parsed.json) {
            note(io2, `Waiting up to ${parsed.waitSeconds}s for the browser to connect.`);
          }
          try {
            const connected = await waitForBrowser({ waitSeconds: parsed.waitSeconds });
            if (!parsed.json) {
              note(io2, `Connected as "${connected.label}" (${connected.browserId}).`);
            }
          } catch {
            if (!parsed.json) {
              note(io2, "No browser connected yet. The pairing is saved; press Connect when ready.");
            }
          }
        }
        return 0;
      }
      case "status":
        reportStatus(io2, await status(), parsed.json);
        return 0;
      case "browsers": {
        const browsers = await listBrowsers();
        if (parsed.json) {
          json(io2, { ok: true, browsers });
        } else if (browsers.length === 0) {
          note(io2, `No browser is connected. ${CONNECT_HINT}`);
          return 3;
        } else {
          line(io2, formatBrowsers(browsers));
        }
        return 0;
      }
      case "tabs": {
        await warnIfWaiting(io2, parsed.waitSeconds, parsed.json);
        const result = await listTabs({
          ...parsed.browser !== void 0 ? { browser: parsed.browser } : {},
          waitSeconds: parsed.waitSeconds
        });
        if (parsed.json) {
          json(io2, { ok: true, ...result });
        } else {
          line(io2, formatTabs(result.windows, result.tabs));
        }
        return 0;
      }
      case "scan": {
        if (parsed.urls !== void 0)
          return await runBatch(parsed, io2);
        checkOutput(scanOptionsOf(parsed), 1);
        await warnIfWaiting(io2, parsed.waitSeconds, parsed.json);
        const result = await scan({
          ...parsed.url !== void 0 ? { url: parsed.url } : {},
          ...parsed.tabId !== void 0 ? { tabId: parsed.tabId } : {},
          ...scanOptionsOf(parsed)
        });
        reportScan(io2, result, parsed.format, parsed.json);
        return 0;
      }
      case "diff":
        return reportDiff(io2, diffCaptures(parsed.old, parsed.new, parsed.out !== void 0 ? { out: parsed.out } : {}), parsed.json);
      case "verify":
        return reportVerify(io2, await verifyCapture(parsed.file, parsed.record !== void 0 ? { record: parsed.record } : {}), parsed.json);
      case "design": {
        const urls = batchUrls(parsed, io2);
        const several = urls.length > 1 || parsed.crawl !== void 0;
        const result = await extractDesign({
          ...urls.length > 0 ? { urls } : {},
          ...parsed.crawl !== void 0 ? {
            crawl: {
              start: parsed.crawl,
              ...parsed.maxPages !== void 0 ? { maxPages: parsed.maxPages } : {},
              ...parsed.depth !== void 0 ? { maxDepth: parsed.depth } : {}
            }
          } : {},
          ...parsed.tabId !== void 0 ? { tabId: parsed.tabId } : {},
          ...parsed.windowId !== void 0 ? { windowId: parsed.windowId } : {},
          ...parsed.browser !== void 0 ? { browser: parsed.browser } : {},
          ...parsed.out !== void 0 ? { out: parsed.out } : {},
          ...parsed.minUses !== void 0 ? { minUses: parsed.minUses } : {},
          ...parsed.components ? { components: true } : {},
          waitSeconds: parsed.waitSeconds,
          timeoutSeconds: parsed.timeoutSeconds,
          ...several && !parsed.json ? {
            onPage: (page) => note(io2, describeDesignPage(page))
          } : {}
        });
        const failed = result.pages.filter((page) => !page.ok && !page.left).length;
        if (parsed.json) {
          json(io2, { ok: true, ...result });
          return failed > 0 ? 1 : 0;
        }
        const groups = Object.entries(result.tokens).map(([group, count]) => `${count} ${group}`).join(", ");
        const read2 = result.pages.filter((page) => page.ok).length;
        note(io2, (several ? `Read ${read2} of ${result.pages.length} pages. ` : "") + (result.crawl ? crawlNote(result.crawl) : "") + `Tokens: ${groups || "none"} (${result.declared} declared by the ${several ? "site" : "page"}` + (result.unusedDeclared > 0 ? `; ${result.unusedDeclared} declared colors nothing is drawn in left out` : "") + "). " + (result.onePage > 0 ? `${result.onePage} values used on one page only; ` : "") + `${result.nearlyEqual} nearly equal pairs; ${result.contrast.failing} of ${result.contrast.pairs} text pairs below WCAG AA` + (result.contrast.overImage > 0 ? `, ${result.contrast.overImage} over a picture left to check by eye.` : ".") + (result.darkDiffers ? " The dark scheme differs, and tokens.css says how." : "") + (result.components ? ` ${result.components.components} components in ${result.components.variants} variants` + (result.components.components > 0 ? ", drawn in catalog.pdf." : "; nothing to draw a catalog of.") : ""));
        line(io2, result.directory);
        return failed > 0 ? 1 : 0;
      }
      case "stop": {
        const wasRunning = await stopDaemon();
        if (parsed.json)
          json(io2, { ok: true, stopped: wasRunning });
        else
          note(io2, wasRunning ? "Stopped." : "No daemon was running.");
        return 0;
      }
      case "serve": {
        const { runDaemon: runDaemon2 } = await Promise.resolve().then(() => (init_run(), run_exports));
        await runDaemon2({
          detached: parsed.daemon,
          ...parsed.idleMinutes !== void 0 ? { idleMinutes: parsed.idleMinutes } : {},
          log: (message) => note(io2, message)
        });
        return 0;
      }
    }
  } catch (error) {
    const failure = toPageScannerError(error);
    const code2 = exitCodeFor(failure.code);
    const useJson = "json" in parsed && parsed.json === true;
    if (useJson) {
      json(io2, { ok: false, code: code2, error: failure.code, message: failure.message });
    } else {
      note(io2, failure.message);
      if (failure.hint)
        note(io2, failure.hint);
    }
    return code2;
  }
}

// node_modules/@page-scanner/cli/dist/bin.js
init_errors();
var io = {
  stdout: (text) => void process.stdout.write(text),
  stderr: (text) => void process.stderr.write(text)
};
async function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    return { code: await runCommand(parsed, io), command: parsed.command };
  } catch (error) {
    const failure = toPageScannerError(error);
    const code2 = exitCodeFor(failure.code);
    if (process.argv.slice(2).includes("--json")) {
      const envelope = { ok: false, code: code2, error: failure.code, message: failure.message };
      process.stdout.write(`${JSON.stringify(envelope, null, 2)}
`);
    } else {
      process.stderr.write(`${failure.message}
`);
      if (failure.hint)
        process.stderr.write(`${failure.hint}
`);
      process.stderr.write("Run `page-scanner --help` for the full surface.\n");
    }
    return { code: code2, command: "help" };
  }
}
var { code, command } = await main();
process.exitCode = code;
if (command !== "serve") {
  process.stdout.write("", () => process.exit(code));
}
