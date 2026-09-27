import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { ApiError, userMessage } from "./lib/backend";
import { appOpened, sendEvent } from "./lib/events";
import { captureToRequest, createCard } from "./lib/gtd";
import { clearSession, getSession } from "./lib/session";

type Props = LaunchProps<{ arguments: Arguments.QuickCapture }>;

// No view: type it in the root search, press Enter, done. The process ends when this promise
// resolves, so the event is awaited rather than fire-and-forget.
export default async function Command(props: Props) {
  await appOpened();
  const title = props.arguments.title.trim();
  if (!title) {
    await showToast({ style: Toast.Style.Failure, title: "Write something first" });
    return;
  }
  if (!(await getSession())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sign in first",
      message: "Run any GTD Brain command with a view (Inbox, Capture to Inbox) to sign in.",
    });
    return;
  }
  try {
    const card = await createCard(captureToRequest(title));
    await sendEvent("card_created", {
      columnKind: "normal",
      via: "raycast_extension",
      withNotes: false,
      cardId: card.id,
    });
    await showHUD(`Captured: ${card.title}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
      await showToast({
        style: Toast.Style.Failure,
        title: "Signed out",
        message: "Run Inbox or Capture to Inbox to sign in again.",
      });
      return;
    }
    await showToast({ style: Toast.Style.Failure, title: "Could not capture", message: userMessage(e) });
  }
}
