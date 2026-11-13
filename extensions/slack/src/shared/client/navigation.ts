type Application = { name: string; bundleId?: string; path: string };

export function isSlackApplication(app: Application): boolean {
  return (
    app.bundleId === "com.tinyspeck.slackmacgap" ||
    /^slack(?:\.exe| beta)?$/i.test(app.name) ||
    /(?:^|[/\\])slack(?: beta)?\.(?:app|exe)$/i.test(app.path)
  );
}

export type SlackLinkPreference = "auto" | "slack" | "browser";

export async function shouldOpenInSlack(
  preference: SlackLinkPreference,
  getApplications: () => Promise<Application[]>,
): Promise<boolean> {
  if (preference !== "auto") return preference === "slack";
  try {
    return (await getApplications()).some(isSlackApplication);
  } catch {
    // App enumeration can fail even when the slack:// protocol handler is registered.
    return true;
  }
}
