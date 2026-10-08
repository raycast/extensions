"use strict";
// Store-clean replacement for the CLI's config module (no package.json read).
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_VERSION = void 0;
exports.loadConfig = loadConfig;
exports.platformName = platformName;
const DEFAULT_BASE_URL = "https://tapi.jovida.ai";
const DEFAULT_APP_ID = "2012";
function loadConfig() {
  return {
    baseUrl: process.env["JOVIDA_API_URL"] || DEFAULT_BASE_URL,
    appId: process.env["JOVIDA_APP_ID"] || DEFAULT_APP_ID,
  };
}
exports.APP_VERSION = "0.0.14";
function platformName() {
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  return "linux";
}
