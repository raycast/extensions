import { getPreferenceValues } from "@raycast/api";
import { resolvePerson } from "./contacts";
import { RETURN, TeamsError, activateTeams, openInTeams, pause, press, typeText } from "./teams";

export interface ChatRequest {
  person: string;
  message?: string;
  send: boolean;
}

/** What happened, for the HUD. */
export interface ChatResult {
  label: string;
  sent: boolean;
  typed: boolean;
}

function chatLink(email: string, message?: string): string {
  // Spaces must be %20; Teams does not decode "+" in these links.
  const params = [`users=${encodeURIComponent(email)}`];
  if (message) params.push(`message=${encodeURIComponent(message)}`);
  return `https://teams.microsoft.com/l/chat/0/0?${params.join("&")}`;
}

export function callLink(email: string, video: boolean): string {
  return `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(email)}${video ? "&withVideo=true" : ""}`;
}

/**
 * Opens the chat through Teams search, the way you would by hand: ⌘E, the
 * name, then Return twice: once for the suggestion, once for the chat. Used for names that are neither
 * an email address nor a saved contact.
 */
async function openThroughSearch(query: string): Promise<void> {
  await activateTeams();
  await press({ char: "e" }, ["command"]);
  await pause(300);
  await typeText(query);
  // Teams needs a moment to show the suggestions.
  await pause(900);
  await press(RETURN);
  await pause(300);
  await press(RETURN);
  // No further Return: in a chat with an unsent draft it would send that draft.
  await pause(1500);
}

export async function openChat(request: ChatRequest): Promise<ChatResult> {
  const message = request.message?.trim() || undefined;
  const target = await resolvePerson(request.person);

  if (target.kind === "email") {
    // The link opens the chat and puts the message into the box as a draft.
    await openInTeams(chatLink(target.email, message));
    if (message && request.send) {
      await activateTeams();
      // The chat opens a little after Teams comes to the front.
      await pause(1800);
      await press(RETURN);
    }
    return { label: target.label, sent: Boolean(message && request.send), typed: Boolean(message) };
  }

  const { searchUnknownNames } = getPreferenceValues<Preferences>();
  if (!searchUnknownNames) {
    throw new TeamsError(
      `"${target.query}" is neither an email address nor a saved contact. Add it in Teams Contacts, or turn on Teams search for unknown names.`,
    );
  }
  await openThroughSearch(target.query);
  if (message) {
    await typeText(message);
    if (request.send) {
      await pause(300);
      await press(RETURN);
    }
  }
  return { label: target.query, sent: Boolean(message && request.send), typed: Boolean(message) };
}

export function chatHud(result: ChatResult): string {
  if (result.sent) return `Sent to ${result.label}`;
  if (result.typed) return `Message for ${result.label} is ready – press Return to send`;
  return `Opened the chat with ${result.label}`;
}
