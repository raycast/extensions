import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { promises as fs } from "node:fs";
import { runClaudeJson } from "./lib/claude";
import { toApiContent } from "./lib/conversations";
import { showErrorHUD } from "./lib/errors";
import { addHistory, historyFromUsage } from "./lib/history";
import { OCR_PROMPT, TEXT_SCHEMA } from "./lib/prompts";
import { settings } from "./lib/settings";
import { captureRegion } from "./lib/system";
import { formatNumber } from "./lib/text";
import { recordUsage } from "./lib/usage";

export default async function Command() {
  await closeMainWindow();
  const s = settings();
  let toast: Toast | undefined;
  const capture = await captureRegion(false).catch(() => null);
  if (!capture) return;
  try {
    toast = await showToast({ style: Toast.Style.Animated, title: "Reading text…" });
    const content = await toApiContent([
      { type: "image", path: capture.path, mediaType: capture.mediaType },
      { type: "text", text: OCR_PROMPT },
    ]);
    const { data, response } = await runClaudeJson<{ text: string }>({
      apiKey: s.apiKey,
      model: s.model,
      effort: "low",
      schema: TEXT_SCHEMA,
      messages: [{ role: "user", content }],
    });
    await toast.hide();
    await recordUsage(response.usage);
    const text = data.text.trim();
    if (!text) {
      await showHUD("No text found in the image");
      return;
    }
    await Clipboard.copy(text);
    if (s.keepHistory) {
      await addHistory(historyFromUsage("screen-text", "Copy Text from Screen", "[screenshot]", text, response.usage));
    }
    await showHUD(`✓ Copied ${formatNumber(text.length)} characters`);
  } catch (error) {
    await toast?.hide();
    await showErrorHUD(error);
  } finally {
    await fs.rm(capture.path, { force: true });
  }
}
