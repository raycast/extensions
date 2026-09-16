import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EDITOR_CHOICES,
  openers,
  resolveEditor,
  showsBetterThanAnEditor,
  SYSTEM_DEFAULT,
} from "../src/lib/editor";
import { ORCA_BUNDLE_ID } from "../src/lib/paths";
import { manifestDropdown } from "./fixtures";

test("the OS is preferred for what an editor cannot render", () => {
  assert.equal(showsBetterThanAnEditor("/root/pixie/shot.png"), true);
  assert.equal(showsBetterThanAnEditor("/root/pixie/docs/spec.pdf"), true);
  assert.equal(showsBetterThanAnEditor("/root/pixie/demo.mov"), true);
  assert.equal(showsBetterThanAnEditor("/root/pixie/budget.xlsx"), true);
});

test("source and data go to an editor", () => {
  // The whole point of the inversion: anything not named here reaches VS Code,
  // whatever the local machine happens to have bound to it.
  assert.equal(showsBetterThanAnEditor("/root/pixie/src/main.ts"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/session.jsonl"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/notes.md"), false);
});

test("nothing that acts on the file can reach its handler", () => {
  // The hazards the previous denylist tried and failed to enumerate. `.sh` is
  // the one that proves the point: it is bound to a terminal emulator on this
  // machine by user choice, which no static list of ours could have predicted.
  assert.equal(showsBetterThanAnEditor("/root/pixie/deploy.command"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/build.sh"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/app.jar"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/installer.pkg"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/archive.zip"), false);
});

test("the extension is matched without regard to case", () => {
  // HFS+ and APFS are case-insensitive by default, so the binding macOS uses
  // does not care either; a set lookup on the raw extension would.
  assert.equal(showsBetterThanAnEditor("/root/pixie/Shot.PNG"), true);
  assert.equal(showsBetterThanAnEditor("/root/pixie/Spec.Pdf"), true);
});

test("a file with no extension goes to an editor", () => {
  assert.equal(showsBetterThanAnEditor("/root/pixie/Makefile"), false);
  assert.equal(showsBetterThanAnEditor("/root/pixie/bin/agent"), false);
});

test("Orca and System Default stay distinguishable", () => {
  // Both name no `open` target, and collapsing them costs the Orca user their
  // editor: a file outside a worktree would go to the file association, which
  // is what System Default asked for and Orca did not.
  // The platform is passed explicitly here and everywhere below: these are
  // macOS answers, and a suite that reads the host's platform would report them
  // as failures on a Windows machine rather than as the cases they are.
  assert.deepEqual(resolveEditor(ORCA_BUNDLE_ID, false), { kind: "orca" });
  assert.deepEqual(resolveEditor(SYSTEM_DEFAULT, false), { kind: "system" });
  assert.deepEqual(resolveEditor(undefined, false), { kind: "system" });
});

test("any other choice is an open target, and keeps Orca out of it", () => {
  assert.deepEqual(resolveEditor("dev.zed.Zed", false), {
    kind: "app",
    bundleId: "dev.zed.Zed",
  });
});

test("the manifest dropdown matches the editors the code knows", () => {
  assert.deepEqual(
    manifestDropdown("editorApp"),
    EDITOR_CHOICES.map((e) => ({ title: e.name, value: e.bundleId })),
  );
});

test("Windows opens through the file association", () => {
  // No bundle ids there, and the GUI executables are not on PATH, so naming an
  // app is not something we can do reliably.
  const plans = openers("C:\\code\\pixie\\notes.md", { kind: "system" }, true);
  assert.deepEqual(plans, [
    {
      exe: "powershell.exe",
      args: [
        "-NoProfile",
        "-Command",
        "Invoke-Item -LiteralPath 'C:\\code\\pixie\\notes.md' -ErrorAction Stop",
      ],
    },
  ]);
});

test("a path that would be command syntax to cmd stays one literal", () => {
  // The defect this shape exists to close: `&` splits a cmd command line, and
  // Node quotes an argument only when it holds a space, tab or quote, so a path
  // reached `start` bare and the tail ran as a command. These paths come out of
  // transcript text, so they are the transcript author's to choose.
  const plans = openers(
    "C:\\code\\R&D\\my %USERPROFILE% file's.md",
    { kind: "system" },
    true,
  );
  // One PowerShell literal: the quote is doubled, and `&` and `%` are ordinary
  // characters inside it — PowerShell expands neither, and nothing re-parses it.
  assert.deepEqual(
    plans[0].args[2],
    String.raw`Invoke-Item -LiteralPath 'C:\code\R&D\my %USERPROFILE% file''s.md' -ErrorAction Stop`,
  );
  assert.equal(plans.length, 1);
});

test("Windows sends the extensions it has no handler for to Notepad", () => {
  // `.jsonl` is what "Open Raw Transcript" produces and Windows claims it with
  // nothing, so the association would only ever show the "How do you want to
  // open this file?" picker. Notepad ships with the OS and a transcript is text.
  const plans = openers(
    "C:\\code\\pixie\\session.jsonl",
    { kind: "system" },
    true,
  );
  assert.deepEqual(plans, [
    {
      exe: "powershell.exe",
      args: [
        "-NoProfile",
        "-Command",
        // -ErrorAction Stop is the difference between a Notepad that was
        // never there (it is an optional Store app now) failing loudly and
        // failing at exit code zero, which this branch has no second opener to
        // recover from.
        `Start-Process -FilePath 'notepad.exe' -ArgumentList @('"C:\\code\\pixie\\session.jsonl"') -ErrorAction Stop`,
      ],
    },
  ]);
});

test("Notepad is not a fallback behind the association", () => {
  // ShellExecute succeeds even with nothing to open the file with, so a second
  // opener could never be reached. Each extension gets one opener, chosen up
  // front; the extensions Windows does claim keep the user's own association.
  for (const path of ["C:\\a\\notes.md", "C:\\a\\out.log", "C:\\a\\pkg.json"]) {
    const plans = openers(path, { kind: "system" }, true);
    assert.equal(plans.length, 1);
    assert.match(plans[0].args[2], /^Invoke-Item /);
  }
});

test("a named editor collapses to the association on Windows", () => {
  // Better an honest deferral than a preference that silently opens the wrong
  // app, or nothing at all.
  assert.deepEqual(resolveEditor("com.microsoft.VSCode", true), {
    kind: "system",
  });
  assert.deepEqual(resolveEditor(ORCA_BUNDLE_ID, true), { kind: "system" });
  // ...and is still honoured on macOS, which is where those ids mean something.
  assert.deepEqual(resolveEditor("com.microsoft.VSCode", false), {
    kind: "app",
    bundleId: "com.microsoft.VSCode",
  });
});

test("the macOS chain puts the chosen editor first and TextEdit last", () => {
  const plans = openers(
    "/root/pixie/notes.md",
    { kind: "app", bundleId: "dev.zed.Zed" },
    false,
  );
  assert.deepEqual(plans[0].args, [
    "-b",
    "dev.zed.Zed",
    "/root/pixie/notes.md",
  ]);
  assert.deepEqual(plans.at(-1)?.args, [
    "-b",
    "com.apple.TextEdit",
    "/root/pixie/notes.md",
  ]);
  assert.ok(plans.every((p) => p.exe === "/usr/bin/open"));
});

test("the OS goes in front of the editor the user chose, for what it renders", () => {
  // A named editor is a preference about text, not an instruction to open a
  // screenshot in it. The bare path is `open` with no `-b`, i.e. the binding.
  for (const path of ["/root/pixie/shot.png", "/root/pixie/docs/spec.pdf"]) {
    const plans = openers(
      path,
      { kind: "app", bundleId: "dev.zed.Zed" },
      false,
    );
    assert.deepEqual(plans[0], { exe: "/usr/bin/open", args: [path] });
    // ...and the chosen app is still behind it, for a binding that is missing.
    assert.deepEqual(plans[1].args, ["-b", "dev.zed.Zed", path]);
  }
});

test("System Default puts the binding in front for text too", () => {
  const plans = openers("/root/pixie/notes.md", { kind: "system" }, false);
  assert.deepEqual(plans[0], {
    exe: "/usr/bin/open",
    args: ["/root/pixie/notes.md"],
  });
  // The editor chain stays behind it: `.jsonl` is bound to nothing, so the
  // binding can fail and something still has to show the file.
  assert.deepEqual(plans[1].args, [
    "-b",
    "com.microsoft.VSCode",
    "/root/pixie/notes.md",
  ]);
});

test("an Orca user outside a worktree gets editors, never the binding", () => {
  // The case the ordering exists to protect: reaching here means Orca could not
  // take the file, and that user asked for Orca, not for the file association.
  const plans = openers("/root/pixie/notes.md", { kind: "orca" }, false);
  assert.ok(plans.every((p) => p.args[0] === "-b"));
  assert.deepEqual(plans[0].args, [
    "-b",
    "com.microsoft.VSCode",
    "/root/pixie/notes.md",
  ]);
  // An image is the exception, being something no editor renders at all.
  const image = openers("/root/pixie/shot.png", { kind: "orca" }, false);
  assert.deepEqual(image[0], {
    exe: "/usr/bin/open",
    args: ["/root/pixie/shot.png"],
  });
});
