import { execFile, spawn } from "child_process";
import { randomBytes, randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SHORTCUTS = "/usr/bin/shortcuts";

export const HELPER_SHORTCUT_NAME = "Raycast Focus Modes";
const DO_NOT_DISTURB_ID = "com.apple.donotdisturb.mode.default";

export interface ShortcutFocusMode {
  id: string;
  name: string;
}

type Action = { WFWorkflowActionIdentifier: string; WFWorkflowActionParameters: Record<string, unknown> };

const action = (identifier: string, parameters: Record<string, unknown>): Action => ({
  WFWorkflowActionIdentifier: identifier,
  WFWorkflowActionParameters: parameters,
});

const text = (value: string) => ({
  WFSerializationType: "WFTextTokenString",
  Value: { string: value, attachmentsByRange: {} },
});

function setFocus(mode: ShortcutFocusMode, enabled: boolean): Action {
  const parameters: Record<string, unknown> = { Enabled: enabled ? 1 : 0 };
  // Do Not Disturb is the action's default Focus, so it is selected by leaving FocusModes out.
  if (mode.id !== DO_NOT_DISTURB_ID) {
    parameters.FocusModes = { Identifier: mode.id, DisplayString: mode.name };
  }
  return action("is.workflow.actions.dnd.set", parameters);
}

function ifInputIs(inputUUID: string, value: string, body: Action[]): Action[] {
  const group = randomUUID().toUpperCase();
  return [
    action("is.workflow.actions.conditional", {
      GroupingIdentifier: group,
      WFControlFlowMode: 0,
      WFCondition: 4,
      WFConditionalActionString: value,
      WFInput: {
        Type: "Variable",
        Variable: {
          WFSerializationType: "WFTextTokenAttachment",
          Value: { Type: "ActionOutput", OutputName: "Updated Text", OutputUUID: inputUUID },
        },
      },
    }),
    ...body,
    action("is.workflow.actions.conditional", { GroupingIdentifier: group, WFControlFlowMode: 1 }),
    action("is.workflow.actions.conditional", { GroupingIdentifier: group, WFControlFlowMode: 2 }),
  ];
}

const stopAndOutput = (value: string) => action("is.workflow.actions.output", { WFOutput: text(value) });

/**
 * Shortcuts' "Set Focus" action can't take its Focus from a variable, so the helper shortcut
 * hard-codes branches for each Focus mode. Its input is a mode identifier (turn that mode on)
 * or "off:" and an identifier (turn that mode off). It outputs "ok", or "unknown" for a mode it
 * wasn't built with.
 */
export function buildHelperShortcut(modes: ShortcutFocusMode[]) {
  const inputUUID = randomUUID().toUpperCase();
  return {
    WFWorkflowClientVersion: "2607.0.4",
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: "900",
    WFWorkflowIcon: { WFWorkflowIconStartColor: 2071128575, WFWorkflowIconGlyphNumber: 59782 },
    WFWorkflowImportQuestions: [],
    WFWorkflowTypes: [],
    WFQuickActionSurfaces: [],
    WFWorkflowHasShortcutInputVariables: true,
    WFWorkflowInputContentItemClasses: ["WFStringContentItem", "WFGenericFileContentItem"],
    WFWorkflowOutputContentItemClasses: ["WFStringContentItem"],
    WFWorkflowActions: [
      action("is.workflow.actions.text.trimwhitespace", {
        UUID: inputUUID,
        WFInput: {
          WFSerializationType: "WFTextTokenString",
          Value: { string: "￼", attachmentsByRange: { "{0, 1}": { Type: "ExtensionInput" } } },
        },
      }),
      ...modes.flatMap((mode) => [
        ...ifInputIs(inputUUID, mode.id, [setFocus(mode, true), stopAndOutput("ok")]),
        ...ifInputIs(inputUUID, `off:${mode.id}`, [setFocus(mode, false), stopAndOutput("ok")]),
      ]),
      stopAndOutput("unknown"),
    ],
  };
}

/**
 * A fresh name for a generated helper, such as "Raycast Focus Modes 4F7A2C". Shortcuts names an
 * imported shortcut after its file, so a shortcut that appears with exactly this name right after
 * its file was opened is the helper, and no other shortcut can be mistaken for it.
 */
export function newHelperName(): string {
  return `${HELPER_SHORTCUT_NAME} ${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Writes a signed helper shortcut called `name` into an empty `directory` and returns its path. */
export async function writeSignedHelperShortcut(
  modes: ShortcutFocusMode[],
  directory: string,
  name: string,
): Promise<string> {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const json = join(directory, "helper.json");
  const unsigned = join(directory, "helper-unsigned.shortcut");
  const signed = join(directory, `${name}.shortcut`);
  await writeFile(json, JSON.stringify(buildHelperShortcut(modes)));
  await execFileAsync("/usr/bin/plutil", ["-convert", "binary1", "-o", unsigned, json]);
  await execFileAsync(SHORTCUTS, ["sign", "--mode", "people-who-know-me", "-i", unsigned, "-o", signed]);
  return signed;
}

export interface InstalledShortcut {
  name: string;
  id: string;
}

/** Parses `shortcuts list --show-identifiers`, which prints one "Name (IDENTIFIER)" per line. */
export function parseShortcutList(listOutput: string): InstalledShortcut[] {
  const shortcuts: InstalledShortcut[] = [];
  for (const line of listOutput.split("\n")) {
    const match = /^(.*) \(([0-9A-F-]{36})\)$/i.exec(line.trim());
    if (match) shortcuts.push({ name: match[1], id: match[2] });
  }
  return shortcuts;
}

export async function listShortcuts(): Promise<InstalledShortcut[]> {
  const { stdout } = await execFileAsync(SHORTCUTS, ["list", "--show-identifiers"]);
  return parseShortcutList(stdout);
}

/**
 * Only helper copies this extension added are ever run, and always by identifier. Returns the
 * trusted identifiers (recorded oldest first) that are still installed, newest first.
 */
export function trustedHelperIds(installed: string[], trusted: string[]): string[] {
  return [...trusted].reverse().filter((id) => installed.includes(id));
}

/** Runs a shortcut with `input` on stdin and resolves with its trimmed output. */
export function runShortcut(id: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(SHORTCUTS, ["run", id]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `shortcuts exited with ${code}`)),
    );
    child.stdin.end(input);
  });
}
