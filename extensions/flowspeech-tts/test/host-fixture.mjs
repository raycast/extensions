import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;
export const host = {
  supportPath: "",
  storage: {},
  toasts: [],
  copied: [],
  played: [],
  selected: "Selected words",
  clipboard: "Copied words",
  preferences: { apiKey: "test-key", voiceName: "Kore" },
};

function readStorage() {
  if (host.storageFile && existsSync(host.storageFile)) return JSON.parse(readFileSync(host.storageFile, "utf8"));
  return host.storage;
}
function writeStorage(value) {
  host.storage = value;
  if (host.storageFile) writeFileSync(host.storageFile, JSON.stringify(value), { mode: 0o600 });
}
const raycast = {
  get environment() {
    return { supportPath: host.supportPath };
  },
  getPreferenceValues: () => host.preferences,
  getSelectedText: async () => host.selected,
  Clipboard: {
    readText: async () => host.clipboard,
    copy: async (value) => {
      host.copied.push(value);
    },
  },
  LocalStorage: {
    allItems: async () => readStorage(),
    setItem: async (key, value) => {
      if (host.storageError) throw new Error("Storage unavailable");
      writeStorage({ ...readStorage(), [key]: value });
    },
  },
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  showToast: async (options) => {
    host.toasts.push(options);
    await host.onToast?.(options);
    return options;
  },
};
function execFile(file, args, options, callback) {
  host.played.push({ file, args, options, audio: readFileSync(args[0]) });
  callback(host.playbackError ?? null, "", "");
}
Module._load = function (name, parent, isMain) {
  if (name === "@raycast/api") return raycast;
  if (name === "node:child_process" && parent?.filename.includes("speech")) return { execFile };
  return originalLoad.call(this, name, parent, isMain);
};
export const { speakText } = require("../.test-dist/speech.js");
export const { generateSpeech } = require("../.test-dist/api.js");
export const { toWav } = require("../.test-dist/audio.js");
export const { recoveryRecords, saveRecovery, errorJobId } = require("../.test-dist/recovery.js");
export const selectedCommand = require("../.test-dist/speak-selected.js").default;
export const copiedCommand = require("../.test-dist/speak-copied.js").default;
export const recoveryCommand = require("../.test-dist/show-recovery.js").default;
export function loadBuilt(name) {
  return require(path.resolve(".build", name + ".js")).default;
}
export function records() {
  return Object.values(readStorage()).map((value) => JSON.parse(value));
}
