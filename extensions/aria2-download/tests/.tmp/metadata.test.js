"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// tests/metadata.test.ts
var import_strict = __toESM(require("node:assert/strict"));
var import_node_test = __toESM(require("node:test"));

// src/lib/format.ts
function parseBytes(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

// src/lib/task-type.ts
function isMetadataTask(task) {
  return task.status === "active" && task.bittorrent !== void 0 && parseBytes(task.totalLength) <= 0;
}

// tests/metadata.test.ts
var base = {
  gid: "x",
  status: "active",
  totalLength: "0",
  completedLength: "0",
  uploadLength: "0",
  downloadSpeed: "0",
  uploadSpeed: "0",
  connections: "0",
  dir: "",
  files: []
};
(0, import_node_test.default)("active bittorrent without length is metadata", () => {
  import_strict.default.equal(isMetadataTask({ ...base, bittorrent: {} }), true);
});
(0, import_node_test.default)("active bittorrent with length is a real download", () => {
  import_strict.default.equal(
    isMetadataTask({ ...base, totalLength: "100", bittorrent: {} }),
    false
  );
});
(0, import_node_test.default)("completed metadata is not active metadata", () => {
  import_strict.default.equal(
    isMetadataTask({
      ...base,
      status: "complete",
      totalLength: "512",
      bittorrent: {}
    }),
    false
  );
});
