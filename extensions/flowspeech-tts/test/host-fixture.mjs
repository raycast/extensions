import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { create, act } from "react-test-renderer";
import { setTimeout as delay } from "node:timers/promises";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
  views: [],
  confirmations: [],
  confirm: true,
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
    removeItem: async (key) => {
      if (host.storageError) throw new Error("Storage unavailable");
      const value = { ...readStorage() };
      delete value[key];
      writeStorage(value);
    },
  },
  Detail: frame("Detail"),
  List: Object.assign(frame("List"), { Item: frame("List.Item"), EmptyView: frame("List.EmptyView") }),
  ActionPanel: frame("ActionPanel"),
  Action: Object.assign(frame("Action"), {
    Style: { Destructive: "destructive" },
    CopyToClipboard: (props) =>
      createElement("Action", {
        ...props,
        onAction: () => {
          host.closedWindow = true;
          return raycast.Clipboard.copy(props.content);
        },
      }),
  }),
  Icon: new Proxy({}, { get: (_, name) => name }),
  Alert: { ActionStyle: { Destructive: "destructive" } },
  confirmAlert: async (options) => {
    host.confirmations.push(options);
    return host.confirm;
  },
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  showToast: async (options) => {
    host.toasts.push(host.closedWindow ? { title: options.title, hud: true } : options);
    await host.onToast?.(options);
    return options;
  },
};
function frame(name) {
  return ({ children, actions, ...props }) => createElement(name, props, children, actions);
}
function execFile(file, args, options, callback) {
  host.played.push({ file, args, options, audio: readFileSync(args[0]) });
  if (host.onPlayback) return host.onPlayback(options, callback);
  if (host.holdPlayback) {
    options.signal.addEventListener("abort", () => callback(new Error("Playback aborted")), { once: true });
    return;
  }
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
export const {
  recoveryRecords,
  saveRecovery,
  updateRecovery,
  errorJobId,
  clearCompletedRecovery,
  forgetRecovery,
  MAX_RECOVERY_RECORDS,
  MAX_COMPLETED_RECORDS,
} = require("../.test-dist/recovery.js");
export const selectedCommand = () => runCommand("speak-selected");
export const copiedCommand = () => runCommand("speak-copied");
export const recoveryCommand = () => runCommand("show-recovery");
export function loadBuilt(name) {
  return () => runCommand(name, true);
}
export async function mountCommand(name, built = false, strict = false) {
  const Command = require(path.resolve(built ? ".build" : ".test-dist", name + ".js")).default;
  let view;
  await act(async () => {
    const child = createElement(Command);
    view = create(strict ? createElement(require("react").StrictMode, null, child) : child);
  });
  host.views.push(view);
  return view;
}
export function action(view, title) {
  return view.root.findAllByType("Action").find((item) => item.props.title === title);
}
export async function invoke(view, title) {
  const found = action(view, title);
  if (!found) throw new Error("Missing action: " + title);
  await act(async () => {
    await found.props.onAction();
  });
}
export function viewText(view) {
  return JSON.stringify(view.toJSON());
}
export async function flush() {
  await act(async () => {
    await delay(5);
  });
}
export async function closeViews() {
  for (const view of host.views.splice(0))
    await act(async () => {
      view.unmount();
    });
}
async function runCommand(name, built = false) {
  const view = await mountCommand(name, built);
  for (let i = 0; i < 1000; i++) {
    const running =
      name === "show-recovery"
        ? view.root.findByType("List").props.isLoading
        : action(view, "Stop Waiting") || action(view, "Stop Playback");
    if (!running) {
      if (name === "show-recovery") host.recoveryView = view;
      return view;
    }
    await flush();
  }
  throw new Error("Command view did not settle");
}
export function records() {
  return Object.values(readStorage()).map((value) => JSON.parse(value));
}
