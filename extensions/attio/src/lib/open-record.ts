import { launchCommand, LaunchType } from "@raycast/api";

/** Standard objects each have a home command; anything else has no command to deep-link into. */
const HOME_COMMAND: Record<string, string> = { people: "people", companies: "companies", deals: "deals" };

/**
 * Cross-command deeplink (round 8b §2): opens a record in its home command via
 * launchContext, so a record surfaced in another command's action still lands
 * on its own command's list/detail (pins, sort, etc. all scoped there).
 * Returns false for custom objects (no home command) or on launch failure —
 * callers fall back to an in-command push.
 */
export async function openRecordInHomeCommand(objectSlug: string, recordId: string): Promise<boolean> {
  const name = HOME_COMMAND[objectSlug];
  if (!name) return false;
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated, context: { recordId } });
    return true;
  } catch {
    return false;
  }
}
