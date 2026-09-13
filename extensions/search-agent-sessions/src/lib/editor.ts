import { execFile } from "node:child_process";
import { extname } from "node:path";
import { promisify } from "node:util";
import { IS_WINDOWS, ORCA_BUNDLE_ID, SPAWN_ENV } from "./paths";
import { psCommand, psQuote, startProcess } from "./powershell";

const run = promisify(execFile);

const OPTS = { timeout: 8000, env: SPAWN_ENV } as const;

/**
 * The file kinds worth handing to the OS, being the ones an editor cannot
 * render at all. Everything else goes to an editor.
 *
 * This is deliberately an allowlist. The obvious shape is the opposite one — a
 * list of extensions that are dangerous to hand over, `.command` and `.bat`
 * running in a shell above all — but that list cannot be written. Which
 * application opens a given extension is a per-machine binding the user can
 * change at will, on either platform, so the hazards are not enumerable: `.sh`
 * resolves to a terminal emulator on this machine, `.jar` to JavaLauncher,
 * `.pkg` to Installer, `.zip` to an unarchiver that unpacks into the user's
 * tree. A missing entry here costs someone a spreadsheet opened in VS Code; a
 * missing entry in the other list runs a script they only meant to read.
 */
const SHOWN_BY_OS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".heic",
  ".bmp",
  ".tiff",
  ".pdf",
  ".mov",
  ".mp4",
  ".m4v",
  ".webm",
  ".mp3",
  ".m4a",
  ".wav",
  ".aiff",
  ".xlsx",
  ".xls",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".numbers",
  ".pages",
  ".keynote",
  ".key",
]);

/** Whether the OS shows this file better than a text editor would. */
export function showsBetterThanAnEditor(path: string): boolean {
  return SHOWN_BY_OS.has(extname(path).toLowerCase());
}

/**
 * The extensions Windows ships no handler for, which is exactly what the "Open
 * Raw Transcript" action hands us. ShellExecute cannot fail on an unclaimed
 * extension — it shows the "How do you want to open this file?" picker and
 * reports success — so nothing downstream can rescue the user from that dialog.
 * Naming Notepad up front is the only way to skip it, and a transcript is text.
 *
 * Kept to what is genuinely unclaimed on a stock install. `.md`, `.txt`, `.log`
 * and `.json` all resolve to something, and routing those to Notepad would
 * override an association the user chose in Explorer.
 */
const NO_WINDOWS_HANDLER = new Set([".jsonl", ".ndjson"]);

/**
 * Where files go, once the "Open Files With" preference is applied.
 *
 * Three states rather than an optional bundle id, because "Orca" and "System
 * Default" both name no `open` target and would otherwise be the same value.
 * They want opposite fallbacks: an Orca user who lands outside a worktree wants
 * their editor, where a System Default user asked for the file association.
 */
export type EditorChoice =
  { kind: "orca" } | { kind: "system" } | { kind: "app"; bundleId: string };

/** The dropdown value meaning "whatever the OS opens this with". */
export const SYSTEM_DEFAULT = "system";

/**
 * The editors the preference offers. Curated for the same reason terminals are,
 * with {@link SYSTEM_DEFAULT} carrying everyone whose editor is not here: a
 * JetBrains IDE, BBEdit, an Emacs build. Nothing is unreachable, it just goes
 * through the file association rather than by name.
 *
 * `package.json` repeats this list as the dropdown's `data`, since a manifest
 * cannot import from here. `tests/editor.test.ts` fails if the two drift.
 */
export const EDITOR_CHOICES: { bundleId: string; name: string }[] = [
  { bundleId: ORCA_BUNDLE_ID, name: "Orca" },
  { bundleId: "com.microsoft.VSCode", name: "Visual Studio Code" },
  { bundleId: "com.todesktop.230313mzl4w4u92", name: "Cursor" },
  { bundleId: "dev.zed.Zed", name: "Zed" },
  { bundleId: "com.visualstudio.code.oss", name: "VSCodium" },
  { bundleId: "com.sublimetext.4", name: "Sublime Text" },
  { bundleId: "com.apple.TextEdit", name: "TextEdit" },
  { bundleId: SYSTEM_DEFAULT, name: "System Default" },
];

/**
 * The chain `openPath` walks on macOS when the app the user chose cannot take
 * the file, ending at TextEdit because that ships with the OS: the walk cannot
 * run out of candidates, and a transcript has to open somewhere.
 *
 * Derived from the dropdown rather than listed again. The two were separate
 * lists holding the same six ids in the same order, with nothing comparing
 * them, so an editor added to the dropdown would have been offered, picked, and
 * then skipped by the very chain meant to catch it. The two entries dropped
 * here are the two that name no `open` target.
 */
const MAC_EDITORS = EDITOR_CHOICES.map((c) => c.bundleId).filter(
  (id) => id !== ORCA_BUNDLE_ID && id !== SYSTEM_DEFAULT,
);

/**
 * Where files go, from the bundle id the user picked at install.
 *
 * Orca is the one choice that is not an `open` target: it takes a file through
 * its CLI and only inside a worktree, so choosing it routes worktree files
 * there and leaves everything else to the editor chain in `openPath`.
 *
 * Every named editor collapses to the file association on Windows, because the
 * names above are macOS bundle ids and Windows offers no equally reliable way
 * to name an installed app: the GUI executables are not on PATH, and the CLI
 * shims are `.cmd` files, which Node refuses to spawn without a shell. A
 * preference that silently opened the wrong editor would be worse than one that
 * openly defers to the association, which the user can set once in Explorer.
 */
export function resolveEditor(
  bundleId?: string,
  windows = IS_WINDOWS,
): EditorChoice {
  if (bundleId === ORCA_BUNDLE_ID)
    return windows ? { kind: "system" } : { kind: "orca" };
  if (!bundleId || bundleId === SYSTEM_DEFAULT || windows)
    return { kind: "system" };
  return { kind: "app", bundleId };
}

/** An attempt at opening a file: a program, and the arguments naming the file. */
type Opener = { exe: string; args: string[] };

/**
 * The openers to try in order, most specific first.
 *
 * `/usr/bin/open` is driven directly rather than through the Raycast helper of
 * the same name, so a missing handler is an exit code we can branch on. That is
 * what walks the macOS list: a bundle id sidesteps the extension binding
 * entirely and `open` exits non-zero when that bundle is not installed. It is
 * also what makes a transcript openable at all — `.jsonl` is claimed by
 * nothing, so the default handler fails with kLSApplicationNotFoundErr rather
 * than picking anything.
 *
 * Windows gets exactly one opener, because there is nothing there to walk on.
 * Both forms below go through ShellExecute, which reports success whenever it
 * managed to show the user *something*: with no association it opens the "How
 * do you want to open this file?" picker and still exits zero. So a second
 * opener behind the first could never run, and no failure of the association is
 * observable to us — only a launcher that could not start, or a path that does
 * not exist, ever reaches the caller's toast. The choice between the two is
 * therefore made here, from the extension, rather than by falling over.
 *
 * PowerShell rather than `cmd /c start`. Node quotes an argument only when it
 * holds a space, tab or quote, so `&`, `|`, `^` and `%` in a path reached cmd
 * bare and were re-parsed as command syntax: `C:\code\R&D\notes.md` ran
 * `D\notes.md`. These paths come out of transcript text through `findPaths`,
 * which makes them the transcript author's input, not ours. `Invoke-Item
 * -LiteralPath` takes one PowerShell literal and hands it to the shell as a
 * name — no second parse, and `[`/`]`, legal in a Windows directory name, stay
 * characters instead of becoming wildcard syntax. `Start-Process` is the form
 * used for Notepad because it has no literal parameter; it is also the reason
 * Notepad can be awaited at all, being a launcher that returns as soon as the
 * window exists rather than when the user closes it.
 *
 * The chosen app goes in front of the editor list but still behind the OS for
 * images, PDFs and spreadsheets: a text editor is not what the user wanted for
 * those whichever editor they named.
 */
export function openers(
  path: string,
  choice: EditorChoice,
  windows = IS_WINDOWS,
): Opener[] {
  if (windows) {
    // Notepad is launched rather than run, so PowerShell returns as soon as the
    // window exists instead of blocking until the user closes it — which the
    // 8s timeout in OPTS would otherwise turn into a killed editor and a
    // "could not open" toast for a file that had opened fine.
    //
    // The path carries its own double quotes because this argument has to
    // survive as one. PowerShell 5.1 joins an -ArgumentList with spaces and
    // adds no quoting, so a path containing one would reach Notepad as two
    // arguments and open nothing; a Windows path cannot contain a double quote,
    // so wrapping it is unambiguous. The terminal launcher needs no equivalent,
    // its child being a `-Command` that takes the rest of the line whole.
    const script = NO_WINDOWS_HANDLER.has(extname(path).toLowerCase())
      ? startProcess("notepad.exe", [`"${path}"`])
      : `Invoke-Item -LiteralPath ${psQuote(path)}`;
    return [{ exe: "powershell.exe", args: psCommand(script) }];
  }
  const named = [
    ...(choice.kind === "app" ? [choice.bundleId] : []),
    ...MAC_EDITORS,
  ].map((bundle) => ({ exe: "/usr/bin/open", args: ["-b", bundle, path] }));
  // The OS goes first for the kinds no editor renders, and for the user who
  // asked for the file association rather than a named app. An Orca user who
  // reached here is outside a worktree and wants their editor, not the binding.
  return showsBetterThanAnEditor(path) || choice.kind === "system"
    ? [{ exe: "/usr/bin/open", args: [path] }, ...named]
    : named;
}

/**
 * Open a file: in the chosen app, in an editor, or through the OS for the kinds
 * it renders better.
 *
 * Every candidate {@link openers} produces is a launcher that exits once the
 * file is on screen, never the GUI program itself, which is what makes awaiting
 * them sound: `OPTS.timeout` would otherwise be a clock on how long the user
 * may read before the window is killed under them and a failure toast claims
 * the file never opened.
 */
export async function openPath(
  path: string,
  choice: EditorChoice,
): Promise<void> {
  let last: unknown;
  for (const { exe, args } of openers(path, choice)) {
    try {
      await run(exe, args, OPTS);
      return;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
