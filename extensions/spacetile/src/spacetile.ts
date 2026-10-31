import { closeMainWindow, getApplications, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const bundleId = "com.kodehort.spacetile";

// The same channel as the installed `spacetile` command, posted directly so the extension needs
// neither that command nor a PATH that finds it: Spacetile runs the object of each
// com.kodehort.spacetile.command distributed notification as a command. Prints whether it
// posted, since nothing listens while Spacetile isn't running.
const post = `
function run(argv) {
  ObjC.import("AppKit");
  if (!ObjC.unwrap($.NSRunningApplication.runningApplicationsWithBundleIdentifier($("${bundleId}"))).length) return "not running";
  $.NSDistributedNotificationCenter.defaultCenter.postNotificationNameObjectUserInfoDeliverImmediately(
    $("com.kodehort.spacetile.command"), $(argv[0]), $(), true);
  return "sent";
}`;

/**
 * Sends a command to Spacetile once Raycast has closed, so it acts on the window behind. Returns
 * whether it was sent: a missing Spacetile gets a toast, a stopped one is started and the command
 * dropped, as Spacetile doesn't listen until it has finished starting.
 */
export async function runSpacetile(command: string) {
  try {
    const app = (await getApplications()).find((app) => app.bundleId === bundleId);
    if (!app) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Spacetile isn't installed",
        primaryAction: { title: "Get Spacetile", onAction: () => open("https://spacetile.app") },
      });
      return false;
    }
    await closeMainWindow();
    if ((await runAppleScript(post, [command], { language: "JavaScript" })) === "sent") return true;
    await open(app.path);
    await showHUD("Starting Spacetile. Run the command again once it's ready.");
    return false;
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't reach Spacetile" });
    return false;
  }
}
