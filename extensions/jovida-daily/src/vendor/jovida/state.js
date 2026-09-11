"use strict";
// Store-clean replacement for the CLI's file-based state module.
// Holds token + lastServerVersion IN MEMORY with the same synchronous getter/
// setter interface the vendored session.js / sync.js expect. The driver
// (lib/jovida.ts) hydrates this from Raycast LocalStorage before each operation
// and flushes changes back after — keeping the vendored logic untouched.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.setToken = setToken;
exports.clearCredentials = clearCredentials;
exports.getLastServerVersion = getLastServerVersion;
exports.setLastServerVersion = setLastServerVersion;
exports.getDeviceId = getDeviceId;
exports.writeSnapshotCache = writeSnapshotCache;
exports.invalidateSnapshotCache = invalidateSnapshotCache;
exports.__hydrate = __hydrate;
exports.__snapshot = __snapshot;
exports.__dirty = __dirty;

let _token = null;
let _lastServerVersion = 0;
let _deviceId = "";
let _dirty = false;

function getToken() {
  return _token;
}
function setToken(rec) {
  _token = rec;
  _dirty = true;
}
function clearCredentials() {
  _token = null;
  _dirty = true;
}
function getLastServerVersion() {
  return _lastServerVersion;
}
function setLastServerVersion(v) {
  _lastServerVersion = v;
  _dirty = true;
}
function getDeviceId() {
  return _deviceId;
}

// The CLI's `due` command keeps a file-based snapshot cache so it can answer
// without a full pull; this extension has no `due` command and no disk store, so
// these are no-ops. sync.js calls them after pulls/mutations — harmless here.
function writeSnapshotCache(_payload) {}
function invalidateSnapshotCache() {}

// ---- driver bridge ----
function __hydrate(s) {
  _token = s.token ?? null;
  _lastServerVersion = s.lastServerVersion ?? 0;
  _deviceId = s.deviceId ?? "";
  _dirty = false;
}
function __snapshot() {
  return { token: _token, lastServerVersion: _lastServerVersion, deviceId: _deviceId };
}
function __dirty() {
  return _dirty;
}
