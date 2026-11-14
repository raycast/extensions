import { LaunchProps, LaunchType, launchCommand, showHUD, showToast, Toast } from "@raycast/api";
import { authClient, getAccount, saveMessage } from "./lib/api";

async function openEditor(note: string) {
  await launchCommand({ name: "save-message", type: LaunchType.UserInitiated, context: { note } });
}

export default async function QuickNote({ arguments: { note } }: LaunchProps<{ arguments: Arguments.QuickNote }>) {
  let client: ReturnType<typeof authClient> | undefined;
  try {
    client = authClient();
    if (!(await client.getTokens())?.accessToken) {
      await openEditor(note);
      return;
    }
    const account = await getAccount();
    await saveMessage(account.homeFolder, note);
    await showHUD("Note saved to Inbox");
  } catch (error) {
    try {
      if (client && !(await client.getTokens())?.accessToken) {
        await openEditor(note);
        return;
      }
    } catch {
      // Keep the original failure visible if checking the session also fails.
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Save Note",
      message: error instanceof Error ? error.message : "Please try again.",
    });
  }
}
