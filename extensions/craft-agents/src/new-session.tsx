import { LaunchProps, closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildNewSession } from "./lib/deeplink";
import { PermissionModeSchema, type PermissionMode } from "./lib/deeplink.schema";
import { logger } from "./lib/logger";

type Args = { input?: string; mode?: string };

function normalizeMode(raw?: string): PermissionMode | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const aliases: Record<string, PermissionMode> = {
    plan: "plan",
    accept: "acceptEdits",
    acceptEdits: "acceptEdits",
    "accept-edits": "acceptEdits",
    bypass: "bypassPermissions",
    bypassPermissions: "bypassPermissions",
    default: "default",
  };
  const aliased = aliases[trimmed];
  if (aliased) return aliased;
  const parsed = PermissionModeSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : undefined;
}

export default async function Command(props: LaunchProps<{ arguments: Args }>): Promise<void> {
  try {
    const { input, mode } = props.arguments;
    const url = buildNewSession({
      input: input?.trim() || undefined,
      mode: normalizeMode(mode),
      window: "focused",
    });
    logger.info("new-session.open", { hasInput: Boolean(input), mode });
    await open(url);
    await closeMainWindow();
    await showHUD("Opening new Craft Agents session");
  } catch (err) {
    logger.error("new-session.failed", err);
    await showFailureToast(err, { title: "Failed to open Craft Agents" });
  }
}
