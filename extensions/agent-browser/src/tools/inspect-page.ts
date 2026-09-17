import { runAgentBrowser } from "../lib/agent-browser";

type Operation =
  | "snapshot"
  | "read"
  | "get-text"
  | "get-html"
  | "get-value"
  | "get-attribute"
  | "get-title"
  | "get-url"
  | "get-count"
  | "get-box"
  | "get-styles"
  | "is-visible"
  | "is-enabled"
  | "is-checked"
  | "wait-for-selector"
  | "wait-for-text"
  | "wait-for-url"
  | "wait-for-load"
  | "wait-for-time"
  | "tabs"
  | "back"
  | "forward"
  | "reload"
  | "console"
  | "errors";

type Input = {
  /** Inspection or read-only navigation operation to perform. */
  operation: Operation;
  /** Element ref such as @e2, CSS selector, URL for read, or expected text/URL for wait operations. */
  target?: string;
  /** Attribute name for get-attribute. */
  attribute?: string;
  /** Milliseconds for wait-for-time, from 1 to 10000. */
  milliseconds?: number;
  /** For snapshots, return only interactive elements. Defaults to true. */
  interactiveOnly?: boolean;
  /** Isolated browser session name. Reuse the name passed to Open Browser. Defaults to "raycast". */
  session?: string;
};

/** Inspects the active page without clicking, typing, or submitting anything. */
export default async function inspectPage(input: Input) {
  return runAgentBrowser(buildArguments(input), { session: input.session });
}

function buildArguments(input: Input): string[] {
  switch (input.operation) {
    case "snapshot": {
      const args = ["snapshot"];
      if (input.interactiveOnly !== false) args.push("-i");
      if (input.target) args.push("-s", input.target);
      return args;
    }
    case "read":
      return input.target ? ["read", input.target] : ["read"];
    case "get-text":
      return ["get", "text", required(input.target, "target")];
    case "get-html":
      return ["get", "html", required(input.target, "target")];
    case "get-value":
      return ["get", "value", required(input.target, "target")];
    case "get-attribute":
      return ["get", "attr", required(input.target, "target"), required(input.attribute, "attribute")];
    case "get-title":
      return ["get", "title"];
    case "get-url":
      return ["get", "url"];
    case "get-count":
      return ["get", "count", required(input.target, "target")];
    case "get-box":
      return ["get", "box", required(input.target, "target")];
    case "get-styles":
      return ["get", "styles", required(input.target, "target")];
    case "is-visible":
      return ["is", "visible", required(input.target, "target")];
    case "is-enabled":
      return ["is", "enabled", required(input.target, "target")];
    case "is-checked":
      return ["is", "checked", required(input.target, "target")];
    case "wait-for-selector":
      return ["wait", required(input.target, "target")];
    case "wait-for-text":
      return ["wait", "--text", required(input.target, "target")];
    case "wait-for-url":
      return ["wait", "--url", required(input.target, "target")];
    case "wait-for-load":
      return ["wait", "--load", input.target?.trim() || "networkidle"];
    case "wait-for-time":
      return ["wait", String(requiredMilliseconds(input.milliseconds))];
    case "tabs":
      return ["tab"];
    case "back":
    case "forward":
    case "reload":
    case "console":
    case "errors":
      return [input.operation];
  }
}

function requiredMilliseconds(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1 || value > 10000) {
    throw new Error("milliseconds must be an integer between 1 and 10000.");
  }
  return value;
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required for this operation.`);
  return normalized;
}
