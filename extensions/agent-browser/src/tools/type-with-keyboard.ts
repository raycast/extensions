import { Action, getPreferenceValues, Tool } from "@raycast/api";

import { runAgentBrowser } from "../lib/agent-browser";

type Input = {
  /** Exact complete text to type in one atomic keyboard command. */
  text: string;
  /** Required fresh virtual-key button refs corresponding one-to-one with each character in text. The tool verifies every button label before clicking in text order. */
  keyRefs: string[];
  /** Press Enter after typing the complete text. */
  submit?: boolean;
  /** Accessible name of the virtual submit button. Defaults to "Enter". */
  submitLabel?: string;
  /** Milliseconds to wait before verifying the page, from 0 to 10000. Submissions default to at least 1500. */
  waitAfterMs?: number;
  /** Classify whether submitting this value is an ordinary interaction or a consequential final action. Never downgrade it to avoid confirmation. */
  permissionLevel: "interactive" | "consequential";
  /** Isolated browser session name. Reuse the name passed to Open Browser. Defaults to "raycast". */
  session?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: input.permissionLevel === "consequential" ? Action.Style.Destructive : Action.Style.Regular,
  message: input.submit
    ? "Type and submit this exact value with Agent Browser?"
    : "Type this exact value with Agent Browser?",
  info: [
    { name: "Text", value: input.text },
    { name: "Input Method", value: "Virtual keyboard" },
    { name: "Submit", value: input.submit ? "Yes" : "No" },
    { name: "Session", value: input.session || "raycast" },
  ],
});

/** Atomically types a whole value, optionally submits it, waits for settled state, and returns a full verification snapshot. */
export default async function typeWithKeyboard(input: Input) {
  const text = requiredText(input.text);
  const characters = Array.from(text);
  const keyRefs = input.keyRefs.map(requiredRef);
  if (keyRefs.length !== characters.length) {
    throw new Error("keyRefs must contain exactly one element ref for each character in text.");
  }
  await validateVirtualKeys(characters, keyRefs, input.session);
  const actionResult: unknown[] = [];
  for (const ref of keyRefs) {
    actionResult.push((await runAgentBrowser(["click", ref], { session: input.session })).result);
  }

  let submitted: unknown;
  if (input.submit) {
    const submitArguments = ["find", "role", "button", "click", "--name", input.submitLabel?.trim() || "Enter"];
    submitted = (await runAgentBrowser(submitArguments, { session: input.session })).result;
  }

  const { postInteractionDelayMs } = getPreferenceValues<Preferences>();
  const preferredDelay = Number(postInteractionDelayMs ?? 500);
  const defaultDelay = input.submit ? Math.max(preferredDelay, 1500) : preferredDelay;
  const waitedMs = normalizeWait(input.waitAfterMs ?? defaultDelay);
  if (waitedMs > 0) {
    await runAgentBrowser(["wait", String(waitedMs)], { session: input.session });
  }

  const verification = await runAgentBrowser(["snapshot"], { session: input.session });
  return {
    session: verification.session,
    text,
    inputMethod: "virtual-keyboard",
    submitted: input.submit === true,
    waitedMs,
    actionResult,
    submitResult: submitted,
    verification: verification.result,
  };
}

async function validateVirtualKeys(characters: string[], keyRefs: string[], session?: string): Promise<void> {
  for (const [index, ref] of keyRefs.entries()) {
    const result = await runAgentBrowser(["get", "text", ref], { session });
    const label = extractText(result.result)?.trim();
    if (!label) throw new Error(`Could not read the label for ${ref}. Take a fresh snapshot and try again.`);
    if (label.toLocaleLowerCase() !== characters[index].toLocaleLowerCase()) {
      throw new Error(
        `Key ${ref} is labeled "${label}", but character ${index + 1} of "${characters.join("")}" is "${characters[index]}". Take a fresh snapshot and correct the key refs.`,
      );
    }
  }
}

function extractText(result: unknown): string | undefined {
  if (!isRecord(result) || !isRecord(result.data)) return undefined;
  return typeof result.data.text === "string" ? result.data.text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRef(value: string): string {
  const normalized = value.startsWith("@") ? value : `@${value}`;
  if (!/^@e\d+$/.test(normalized)) throw new Error(`"${value}" is not a valid fresh element ref.`);
  return normalized;
}

function requiredText(value: string): string {
  if (!value) throw new Error("text is required.");
  if (value.length > 1000) throw new Error("text must be 1000 characters or fewer.");
  return value;
}

function normalizeWait(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new Error("waitAfterMs must be an integer between 0 and 10000.");
  }
  return value;
}
