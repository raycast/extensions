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

// tests/format.test.ts
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
function formatEta(total, completed, speed) {
  const totalBytes = parseBytes(total);
  const completedBytes = parseBytes(completed);
  const remaining = totalBytes - completedBytes;
  const bytesPerSecond = parseBytes(speed);
  if (totalBytes <= 0) return "waiting";
  if (remaining <= 0) return "done";
  if (bytesPerSecond <= 0) return "unknown";
  const seconds = Math.ceil(remaining / bytesPerSecond);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// tests/format.test.ts
(0, import_node_test.default)("metadata length reports waiting, not done", () => {
  import_strict.default.equal(formatEta("0", "0", "0"), "waiting");
});
(0, import_node_test.default)("completed task reports done", () => {
  import_strict.default.equal(formatEta("100", "100", "10"), "done");
});
(0, import_node_test.default)("active task reports remaining time", () => {
  import_strict.default.equal(formatEta("100", "50", "10"), "5s");
});
