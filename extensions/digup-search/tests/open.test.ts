import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseEditor, codeLine, editorPlan, KNOWN_EDITORS, type InstalledEditor } from "../src/open/editors";
import { landmark } from "../src/open/landmark";
import {
  IINA,
  iinaLink,
  momentOf,
  pageOf,
  previewSearchArguments,
  PREVIEW_SEARCH_SCRIPT,
  QUICKTIME,
  quickTimeArguments,
  quickTimePlays,
  QUICKTIME_SCRIPT,
  VLC,
  vlcArguments,
  vlcLaunchArguments,
  VLC_SCRIPT,
} from "../src/open/moments";
import { openTitle, planOpen, runOpen, type Effects } from "../src/open/open";
import { hit } from "./fixtures";

const installed = (id: string, appPath: string): InstalledEditor => {
  const editor = KNOWN_EDITORS.find((item) => item.id === id);
  assert.ok(editor, `unknown editor ${id}`);
  return { editor, appPath };
};
const ZED = installed("dev.zed.Zed", "/Applications/Zed.app");
const VSCODE = installed("com.microsoft.VSCode", "/Applications/Visual Studio Code.app");
const FILE = "/Users/sam/My Code/a&b/重试.py";

test("the word searched for in a PDF is the longest of the query's words on that page, as the page spells it", () => {
  const page = "Section 7. Pets. The tenant may keep one cat.";
  assert.equal(landmark(page, ["the", "clause", "about", "pets"]), "Pets");
  assert.equal(landmark(page, ["cat", "the"]), "cat"); // the same length: the one that came first in the query
  assert.equal(landmark(page, ["clause", "tenant"]), "tenant");
  assert.equal(landmark(page, ["of", "to", "7"]), null); // too short to tell a page by
  assert.equal(landmark(page, ["dogs"]), null);
  assert.equal(landmark("租约第七条：宠物", ["宠物"]), null); // two characters: too short
  assert.equal(landmark("a (b.c) d", ["b.c"]), "b.c");
});

test("the editor DigUp is set to is used; otherwise the first one installed; \"\" means the default app", () => {
  const apps = [
    { bundleId: "com.apple.Safari", path: "/Applications/Safari.app" },
    { bundleId: "com.microsoft.VSCode", path: "/Applications/Visual Studio Code.app" },
    { bundleId: "dev.zed.Zed", path: "/Applications/Zed.app" },
    { path: "/Applications/Mystery.app" },
  ];
  assert.deepEqual(chooseEditor("com.microsoft.VSCode", apps), VSCODE);
  assert.deepEqual(chooseEditor(undefined, apps), ZED); // Zed comes first in DigUp's list
  assert.deepEqual(chooseEditor("com.apple.dt.Xcode", apps), ZED); // set to one that isn't installed
  assert.equal(chooseEditor("", apps), null);
  assert.equal(chooseEditor(undefined, [{ bundleId: "com.apple.Safari", path: "/Applications/Safari.app" }]), null);
});

test("each editor is told the line its own way", () => {
  assert.deepEqual(editorPlan(VSCODE, FILE, 12), {
    type: "url",
    url: "vscode://file/Users/sam/My%20Code/a%26b/%E9%87%8D%E8%AF%95.py:12:1",
  });
  assert.deepEqual(editorPlan(ZED, FILE, 12), {
    type: "command",
    program: "/Applications/Zed.app/Contents/MacOS/cli",
    args: [`${FILE}:12`],
    appPath: "/Applications/Zed.app",
  });
  assert.deepEqual(editorPlan(installed("com.apple.dt.Xcode", "/Applications/Xcode.app"), FILE, 3), {
    type: "command",
    program: "/Applications/Xcode.app/Contents/Developer/usr/bin/xed",
    args: ["--line", "3", FILE],
    appPath: "/Applications/Xcode.app",
  });
  assert.deepEqual(editorPlan(installed("com.jetbrains.pycharm", "/Applications/PyCharm.app"), FILE, 3, "pycharm"), {
    type: "command",
    program: "/Applications/PyCharm.app/Contents/MacOS/pycharm",
    args: ["--line", "3", FILE],
    appPath: "/Applications/PyCharm.app",
  });
  assert.deepEqual(editorPlan(installed("com.macromates.TextMate", "/Applications/TextMate.app"), FILE, 3), {
    type: "url",
    url: "txmt://open?url=file%3A%2F%2F%2FUsers%2Fsam%2FMy%2520Code%2Fa%26b%2F%25E9%2587%258D%25E8%25AF%2595.py&line=3",
  });
});

test("code opens at the line of the name or the words; a notebook at its top", () => {
  assert.equal(codeLine(hit({ kind: "code", segment: "lines", loc: 1, locEnd: 33, focus: 8 })), 8);
  assert.equal(codeLine(hit({ kind: "code", segment: "lines", loc: 5, locEnd: 9 })), 5);
  assert.equal(codeLine(hit({ kind: "code", segment: "lines" })), 1);
  assert.equal(codeLine(hit({ kind: "code", segment: "cells", loc: 4, focus: 4 })), 1);
});

test("a moment is a frame or a sound a second or more in; a page is a PDF's", () => {
  assert.equal(momentOf(hit({ kind: "video", segment: "frame", loc: 6.08 })), 6.08);
  assert.equal(momentOf(hit({ kind: "audio", segment: "audio", loc: 25 })), 25);
  assert.equal(momentOf(hit({ kind: "audio", segment: "audio", loc: 0 })), null);
  assert.equal(momentOf(hit({ kind: "video", segment: "name" })), null);
  assert.equal(momentOf(hit({ segment: "page", loc: 3 })), null);
  assert.equal(pageOf(hit({ segment: "page", loc: 3 })), 3);
  assert.equal(pageOf(hit({ segment: "page_image", loc: 12 })), 12);
  assert.equal(pageOf(hit({ segment: "name" })), null);
});

test("QuickTime Player gets the moment in whole milliseconds; IINA in its link", () => {
  assert.deepEqual(quickTimeArguments("/a b/clip.mp4", 6.0833), ["-e", QUICKTIME_SCRIPT, "/a b/clip.mp4", "6083"]);
  assert.match(QUICKTIME_SCRIPT, /set current time of theDocument to theTime/);
  assert.equal(iinaLink("/a b/clip.mp4", 6.0833), "iina://open?url=file%3A%2F%2F%2Fa%2520b%2Fclip.mp4&mpv_start=6.1");
  assert.deepEqual(previewSearchArguments("/a b/lease.pdf", "Pets"), [
    "-l",
    "JavaScript",
    "-e",
    PREVIEW_SEARCH_SCRIPT,
    "/a b/lease.pdf",
    "Pets",
  ]);
});

test("VLC gets the moment in whole seconds, after it has started the file", () => {
  assert.equal(VLC, "org.videolan.vlc");
  assert.deepEqual(vlcArguments("/a b/clip.mkv", 6.0833), ["-e", VLC_SCRIPT, "/a b/clip.mkv", "6"]);
  assert.deepEqual(vlcArguments("/a b/clip.mkv", 0.4), ["-e", VLC_SCRIPT, "/a b/clip.mkv", "0"]);
  // The time is set only once VLC is playing this file: set at once, it would land on whatever was playing before.
  const waits = VLC_SCRIPT.indexOf("path of current item");
  const sets = VLC_SCRIPT.indexOf("set current time to");
  assert.ok(waits > 0 && sets > waits, "the script waits for the file before it sets the time");
});

test("how a result opens: code in the editor, a moment in the player that can be told, a page with its word", () => {
  const code = hit({ kind: "code", segment: "lines", path: FILE, loc: 1, focus: 8 });
  assert.deepEqual(planOpen(code, { editor: VSCODE, words: [] }), {
    type: "editor",
    name: "Visual Studio Code",
    plan: editorPlan(VSCODE, FILE, 8),
  });
  assert.deepEqual(planOpen(code, { editor: null, words: [] }), { type: "plain" });

  const clip = hit({ kind: "video", segment: "frame", path: "/v/zoo.mp4", loc: 6.08 });
  assert.deepEqual(planOpen(clip, { defaultApp: QUICKTIME, words: [] }), { type: "quicktime", seconds: 6.08 });
  assert.deepEqual(planOpen(clip, { defaultApp: IINA, words: [] }), { type: "iina", seconds: 6.08 });
  assert.deepEqual(planOpen(clip, { defaultApp: VLC, words: [] }), { type: "vlc", seconds: 6.08 });
  assert.deepEqual(planOpen(clip, { defaultApp: "com.example.player", words: [] }), { type: "plain" });
  assert.deepEqual(planOpen(hit({ kind: "video", segment: "name" }), { defaultApp: QUICKTIME, words: [] }), { type: "plain" });
  assert.deepEqual(planOpen(hit({ kind: "video", segment: "name" }), { defaultApp: VLC, words: [] }), { type: "plain" });
  const recording = hit({ kind: "audio", segment: "audio", path: "/a/talk.flac", loc: 754 });
  assert.deepEqual(planOpen(recording, { defaultApp: VLC, words: [] }), { type: "vlc", seconds: 754 });

  const page = hit({ segment: "page", loc: 3 });
  assert.deepEqual(planOpen(page, { pageText: "Section 7. Pets.", words: ["pets"] }), { type: "pdf-search", words: "Pets" });
  assert.deepEqual(planOpen(page, { pageText: "Section 7. Pets.", words: ["dogs"] }), { type: "plain" });
  assert.deepEqual(planOpen(page, { pageText: null, words: ["pets"] }), { type: "plain" });
  assert.deepEqual(planOpen(hit({ segment: "page", loc: 1 }), { pageText: "Pets.", words: ["pets"] }), { type: "plain" });
});

test("the open action says what it will do", () => {
  const clip = hit({ kind: "video", segment: "frame", loc: 6.08 });
  assert.equal(openTitle(clip, { defaultApp: QUICKTIME }), "Open at 0:06");
  assert.equal(openTitle(clip, { defaultApp: IINA }), "Open at 0:06");
  assert.equal(openTitle(clip, { defaultApp: VLC }), "Open at 0:06");
  assert.equal(openTitle(clip, { defaultApp: "com.example.player" }), "Open");
  assert.equal(openTitle(clip, {}), "Open");
  assert.equal(openTitle(hit({ kind: "code", segment: "lines" }), { editor: ZED }), "Open in Zed");
  assert.equal(openTitle(hit({ kind: "code", segment: "lines" }), { editor: null }), "Open");
  assert.equal(openTitle(hit({ segment: "page", loc: 3 }), {}), "Open");
});

function effects(execOk = true, stdout = "") {
  const log: string[] = [];
  const fake: Effects = {
    open: async (target, appPath) => {
      log.push(appPath ? `open ${target} in ${appPath}` : `open ${target}`);
    },
    exec: async (program, args) => {
      log.push(`exec ${program} ${args.length} args`);
      return { ok: execOk, stdout };
    },
  };
  return { fake, log };
}

test("an editor's link is opened; its command is run", async () => {
  const link = effects();
  assert.equal(await runOpen({ type: "editor", name: "VS Code", plan: editorPlan(VSCODE, FILE, 8) }, FILE, link.fake), "jumped");
  assert.deepEqual(link.log, ["open vscode://file/Users/sam/My%20Code/a%26b/%E9%87%8D%E8%AF%95.py:8:1"]);
  const command = effects();
  assert.equal(await runOpen({ type: "editor", name: "Zed", plan: editorPlan(ZED, FILE, 8) }, FILE, command.fake), "jumped");
  assert.deepEqual(command.log, ["exec /Applications/Zed.app/Contents/MacOS/cli 1 args"]);
});

test("when the precise way fails, the file is opened plainly", async () => {
  const editor = effects(false);
  assert.equal(await runOpen({ type: "editor", name: "Zed", plan: editorPlan(ZED, FILE, 8) }, FILE, editor.fake), "plain");
  assert.equal(editor.log.at(-1), `open ${FILE} in /Applications/Zed.app`);

  const quickTime = effects(false);
  assert.equal(await runOpen({ type: "quicktime", seconds: 6 }, "/v/zoo.mp4", quickTime.fake), "plain");
  assert.deepEqual(quickTime.log, ["exec /usr/bin/osascript 4 args", "open /v/zoo.mp4"]);

  const preview = effects(true, "no app\n");
  assert.equal(await runOpen({ type: "pdf-search", words: "Pets" }, "/a/lease.pdf", preview.fake), "plain");
  assert.equal(preview.log.at(-1), "open /a/lease.pdf");
});

test("a moment or a page opens the precise way when it works", async () => {
  const quickTime = effects(true, "6.08\n");
  assert.equal(await runOpen({ type: "quicktime", seconds: 6.08 }, "/v/zoo.mp4", quickTime.fake), "jumped");
  assert.deepEqual(quickTime.log, ["exec /usr/bin/osascript 4 args"]);
  const iina = effects();
  assert.equal(await runOpen({ type: "iina", seconds: 6.08 }, "/v/zoo.mp4", iina.fake), "jumped");
  assert.deepEqual(iina.log, ["open iina://open?url=file%3A%2F%2F%2Fv%2Fzoo.mp4&mpv_start=6.1"]);
  const preview = effects(true, "sent\n");
  assert.equal(await runOpen({ type: "pdf-search", words: "Pets" }, "/a/lease.pdf", preview.fake), "jumped");
  assert.deepEqual(preview.log, ["exec /usr/bin/osascript 6 args"]);
  const plain = effects();
  assert.equal(await runOpen({ type: "plain" }, "/a/photo.jpg", plain.fake), "plain");
  assert.deepEqual(plain.log, ["open /a/photo.jpg"]);
});

/** `running`: a VLC is already there. `works`: the way that gets chosen succeeds. */
function vlcEffects(running: boolean, works = true) {
  const log: string[] = [];
  const fake: Effects = {
    open: async (target) => {
      log.push(`open ${target}`);
    },
    exec: async (program, args) => {
      if (program === "/usr/bin/pgrep") return { ok: running, stdout: "" };
      log.push(`${program} ${args.filter((arg) => arg !== VLC_SCRIPT).join(" ")}`);
      return { ok: works, stdout: "" };
    },
  };
  return { fake, log };
}

test("VLC is started with the moment as an argument, so nothing has to control it", async () => {
  assert.deepEqual(vlcLaunchArguments("/a b/clip.mkv", 6.0833), [
    "-n",
    "-b",
    VLC,
    "--args",
    "/a b/clip.mkv",
    ":start-time=6.1",
  ]);
  const started = vlcEffects(false);
  assert.equal(await runOpen({ type: "vlc", seconds: 6.08 }, "/v/my zoo.mkv", started.fake), "jumped");
  assert.deepEqual(started.log, ["/usr/bin/open -n -b org.videolan.vlc --args /v/my zoo.mkv :start-time=6.1"]);
});

test("a VLC that is already running is told the moment by script: arguments only reach an app as it starts", async () => {
  const running = vlcEffects(true);
  assert.equal(await runOpen({ type: "vlc", seconds: 6.08 }, "/v/zoo.mkv", running.fake), "jumped");
  assert.deepEqual(running.log, ["/usr/bin/osascript -e /v/zoo.mkv 6"]);
});

test("when VLC can be neither started nor told, the file is opened plainly", async () => {
  for (const running of [false, true]) {
    const failing = vlcEffects(running, false);
    assert.equal(await runOpen({ type: "vlc", seconds: 6.08 }, "/v/zoo.mkv", failing.fake), "plain");
    assert.equal(failing.log.at(-1), "open /v/zoo.mkv");
  }
});

test("the VLC script does not wait for VLC to answer the open", () => {
  // VLC takes five seconds to answer an open while it already plays the file from its start: waiting for the answer
  // meant the jump came five seconds late, which for a moment a few seconds in looked like no jump at all.
  assert.match(VLC_SCRIPT, /ignoring application responses\s+open theFile\s+end ignoring/);
});

const QUICKTIME_APP = { bundleId: QUICKTIME, path: "/System/Applications/QuickTime Player.app" };
const VLC_APP = { bundleId: VLC, path: "/Applications/VLC.app" };
const OTHER_APP = { bundleId: "com.example.player", path: "/Applications/Example Player.app" };

test("which files QuickTime Player can play is told by their extension", () => {
  for (const name of ["a.mov", "a.MP4", "a.m4v", "a.mp3", "a.m4a", "a.wav", "a.aiff", "a.caf"]) {
    assert.equal(quickTimePlays(`/x/${name}`), true, name);
  }
  for (const name of ["a.mkv", "a.webm", "a.flac", "a.ogg", "a.avi", "a.wmv", "notes"]) {
    assert.equal(quickTimePlays(`/x/${name}`), false, name);
  }
});

test("recordings open in the player chosen in the extension's settings, at the moment when it can be told", () => {
  const clip = hit({ kind: "video", segment: "frame", path: "/v/zoo.mp4", loc: 6.08 });
  // QuickTime Player is the choice out of the box, whatever opens the file by default.
  assert.deepEqual(planOpen(clip, { player: QUICKTIME_APP, defaultApp: VLC, words: [] }), {
    type: "quicktime",
    seconds: 6.08,
  });
  const talk = hit({ kind: "audio", segment: "audio", path: "/a/talk.wav", loc: 754 });
  assert.deepEqual(planOpen(talk, { player: QUICKTIME_APP, defaultApp: "com.apple.Music", words: [] }), {
    type: "quicktime",
    seconds: 754,
  });
  assert.deepEqual(planOpen(clip, { player: VLC_APP, defaultApp: QUICKTIME, words: [] }), { type: "vlc", seconds: 6.08 });
  // An app that can't be told a moment still gets the file, at its start.
  assert.deepEqual(planOpen(clip, { player: OTHER_APP, defaultApp: QUICKTIME, words: [] }), {
    type: "app",
    appPath: "/Applications/Example Player.app",
  });
  // Without a moment the file simply opens in the chosen player.
  const byName = hit({ kind: "video", segment: "name", path: "/v/zoo.mp4" });
  assert.deepEqual(planOpen(byName, { player: QUICKTIME_APP, defaultApp: VLC, words: [] }), {
    type: "app",
    appPath: "/System/Applications/QuickTime Player.app",
  });
});

test("a file QuickTime Player can't play goes to its default app instead", () => {
  const mkv = hit({ kind: "video", segment: "frame", path: "/v/zoo.mkv", loc: 6.08 });
  assert.deepEqual(planOpen(mkv, { player: QUICKTIME_APP, defaultApp: VLC, words: [] }), { type: "vlc", seconds: 6.08 });
  assert.deepEqual(planOpen(mkv, { player: QUICKTIME_APP, defaultApp: "com.example.player", words: [] }), { type: "plain" });
  assert.deepEqual(planOpen(mkv, { player: QUICKTIME_APP, words: [] }), { type: "plain" });
});

test("the chosen player is for recordings only", () => {
  const page = hit({ segment: "page", loc: 3 });
  assert.deepEqual(planOpen(page, { player: QUICKTIME_APP, pageText: "Section 7. Pets.", words: ["pets"] }), {
    type: "pdf-search",
    words: "Pets",
  });
  assert.deepEqual(planOpen(hit({ kind: "image", segment: "image" }), { player: QUICKTIME_APP, words: [] }), { type: "plain" });
});

test("the open action promises a moment only when the player that will be used can go there", () => {
  const clip = hit({ kind: "video", segment: "frame", path: "/v/zoo.mp4", loc: 6.08 });
  assert.equal(openTitle(clip, { player: QUICKTIME_APP, defaultApp: VLC }), "Open at 0:06");
  assert.equal(openTitle(clip, { player: OTHER_APP, defaultApp: QUICKTIME }), "Open");
  const talk = hit({ kind: "audio", segment: "audio", path: "/a/talk.wav", loc: 754 });
  assert.equal(openTitle(talk, { player: QUICKTIME_APP, defaultApp: "com.apple.Music" }), "Open at 12:34");
  const mkv = hit({ kind: "video", segment: "frame", path: "/v/zoo.mkv", loc: 6.08 });
  assert.equal(openTitle(mkv, { player: QUICKTIME_APP, defaultApp: "com.example.player" }), "Open");
  assert.equal(openTitle(mkv, { player: QUICKTIME_APP, defaultApp: VLC }), "Open at 0:06");
});

test("a file is handed to a chosen app that can't be told a moment", async () => {
  const other = effects();
  assert.equal(await runOpen({ type: "app", appPath: OTHER_APP.path }, "/v/zoo.mp4", other.fake), "plain");
  assert.deepEqual(other.log, ["open /v/zoo.mp4 in /Applications/Example Player.app"]);
});

test("when the chosen app or IINA can't take the file, it is opened plainly", async () => {
  const actions = [
    { type: "iina", seconds: 6.08 },
    { type: "app", appPath: "/Applications/Example Player.app" },
  ] as const;
  for (const action of actions) {
    const log: string[] = [];
    const fake: Effects = {
      open: async (target, appPath) => {
        log.push(appPath ? `open ${target} in ${appPath}` : `open ${target}`);
        if (log.length === 1) throw new Error("The application can't open this file.");
      },
      exec: async () => ({ ok: true, stdout: "" }),
    };
    assert.equal(await runOpen(action, "/v/zoo.mp4", fake), "plain", action.type);
    assert.equal(log.length, 2, action.type);
    assert.equal(log[1], "open /v/zoo.mp4", action.type);
  }
});

test("the PDF search word is a whole word on the page, not a piece of a longer one", () => {
  assert.equal(landmark("Please concatenate the files.", ["cat"]), null);
  assert.equal(landmark("Please concatenate the files. The cat sat.", ["cat"]), "cat");
  assert.equal(landmark("Invoice INV-48213 enclosed", ["48213", "inv"]), "48213");
  // Scripts written without spaces have no word edges to look for: there a piece of a run still counts.
  assert.equal(landmark("租约里的宠物条款说明", ["宠物条款"]), "宠物条款");
});

test("the VLC script sets the time only on the file it was asked to open", () => {
  // If VLC hasn't started the file when the wait is over, whatever is playing is something else: setting its time
  // would move the wrong recording, and still report success.
  const afterTheWait = VLC_SCRIPT.slice(VLC_SCRIPT.lastIndexOf("end repeat"));
  const checks = afterTheWait.indexOf("path of current item is thePath");
  const fails = afterTheWait.indexOf("error ");
  const sets = afterTheWait.indexOf("set current time to");
  assert.ok(checks > 0, "after the wait, it checks which file is playing");
  assert.ok(fails > checks, "it fails when that isn't the file");
  assert.ok(sets > fails, "and sets the time only after that");
});
