import { Clipboard, Toast, open, showHUD, showToast } from "@raycast/api";
import { getApiKey } from "./key";
import { getApiUrl, getHeaders, getWebUrl } from "../config";

interface CreationResponse {
  email?: string;
  message?: string;
  messageLinkTitle?: string;
  messageLink?: string;
}

const requestAlias = (note: string) =>
  fetch(`${getApiUrl()}/email/create`, {
    method: "POST",
    headers: getHeaders(getApiKey()),
    body: JSON.stringify({
      description: note ? `${note} (Raycast)` : "Raycast",
    }),
  });

const showServerMessage = async (data: CreationResponse & { message: string }) => {
  const linkTitle = data.messageLink ? (data.messageLinkTitle ?? "") : "";

  await showHUD(`${data.message} ${linkTitle}`.trim());
  await open(data.messageLink ?? getWebUrl("/dashboard"));
};

export const createAndCopyAlias = async (note: string, onInvalidApiKey: (toast: Toast) => Promise<void>) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Email...",
  });

  try {
    const res = await requestAlias(note.trim());

    if (res.status === 401) {
      await onInvalidApiKey(toast);
      return;
    }

    const data = (await res.json()) as CreationResponse;
    await toast.hide();

    if (data.message) {
      await showServerMessage({ ...data, message: data.message });
      return;
    }

    if (!data.email) {
      await showHUD("❌ Email could not be generated. Unknown error");
      return;
    }

    await Clipboard.copy(data.email);
    await showHUD("✅ Copied email to clipboard!");
  } catch (error) {
    await toast.hide();
    await showHUD(`❌ Email could not be generated. ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
