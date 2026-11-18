import { Action, getPreferenceValues, Tool } from "@raycast/api";

import { runAgentBrowser } from "../lib/agent-browser";

type ActionName =
  | "click"
  | "double-click"
  | "fill"
  | "type"
  | "press"
  | "hover"
  | "focus"
  | "select"
  | "check"
  | "uncheck"
  | "scroll"
  | "scroll-into-view";

type Input = {
  /** Page interaction to perform. */
  action: ActionName;
  /** Fresh element ref such as @e2 from the current session's latest snapshot. Never pass visible text or a CSS selector. Not needed for press or scroll. */
  target?: string;
  /** Exact text for fill/type/select, or the key for press. Use Type with Keyboard instead for keyboard-driven apps. */
  value?: string;
  /** Scroll direction. Used only by scroll. */
  direction?: "up" | "down" | "left" | "right";
  /** Optional scroll distance in pixels. */
  pixels?: number;
  /** Milliseconds to wait after this action before returning, from 0 to 10000. Use at least 1500 after submissions or animated state changes. Defaults to the extension preference. */
  waitAfterMs?: number;
  /** Classify whether this is an ordinary interaction or a consequential final action. Never downgrade it to avoid confirmation. */
  permissionLevel: "interactive" | "consequential";
  /** Isolated browser session name. Reuse the name passed to Open Browser. Defaults to "raycast". */
  session?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: input.permissionLevel === "consequential" ? Action.Style.Destructive : Action.Style.Regular,
  message:
    input.permissionLevel === "consequential"
      ? "Allow Agent Browser to perform this consequential page action?"
      : "Allow Agent Browser to interact with this page?",
  info: [
    { name: "Action", value: input.action },
    { name: "Target", value: input.target },
    { name: "Value", value: input.value },
    { name: "Session", value: input.session || "raycast" },
  ],
});

/** Interacts with the active page after explicit user confirmation. */
export default async function interactWithPage(input: Input) {
  const actionResult = await runAgentBrowser(buildArguments(input), { session: input.session });
  const { postInteractionDelayMs } = getPreferenceValues<Preferences>();
  const waitAfterMs = normalizeWait(input.waitAfterMs ?? Number(postInteractionDelayMs ?? 500));
  if (waitAfterMs > 0) {
    await runAgentBrowser(["wait", String(waitAfterMs)], { session: input.session });
  }
  return { ...actionResult, waitedMs: waitAfterMs };
}

function buildArguments(input: Input): string[] {
  switch (input.action) {
    case "click":
      return ["click", requiredRef(input.target)];
    case "double-click":
      return ["dblclick", requiredRef(input.target)];
    case "fill":
    case "type":
    case "select":
      return [input.action, requiredRef(input.target), required(input.value, "value")];
    case "press":
      return ["press", required(input.value, "value")];
    case "hover":
    case "focus":
    case "check":
    case "uncheck":
      return [input.action, requiredRef(input.target)];
    case "scroll": {
      const args = ["scroll", input.direction ?? "down"];
      if (input.pixels !== undefined) {
        if (!Number.isInteger(input.pixels) || input.pixels <= 0 || input.pixels > 10000) {
          throw new Error("pixels must be an integer between 1 and 10000.");
        }
        args.push(String(input.pixels));
      }
      return args;
    }
    case "scroll-into-view":
      return ["scrollintoview", requiredRef(input.target)];
  }
}

function normalizeWait(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new Error("waitAfterMs must be an integer between 0 and 10000.");
  }
  return value;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value === "") throw new Error(`${name} is required for this action.`);
  return value;
}

function requiredRef(value: string | undefined): string {
  const ref = required(value, "target");
  if (!/^@e\d+$/.test(ref)) {
    throw new Error("target must be a fresh element ref such as @e2 from Inspect Page.");
  }
  return ref;
}
