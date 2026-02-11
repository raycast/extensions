import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { TiktokenEncoding } from "tiktoken";
import { get_encoding, init } from "tiktoken/init";
import wasm from "tiktoken/tiktoken_bg.wasm?module";

let initialized = false;
async function initialize() {
  if (initialized) {
    return;
  }

  await init((imports) => WebAssembly.instantiate(wasm, imports));
  initialized = true;
}

const getModelInfo = (encoding: TiktokenEncoding): string => {
  switch (encoding) {
    case "o200k_base":
      return "GPT-4o | o200k_base";
    case "cl100k_base":
      return "GPT-3.5/4 | cl100k_base";
    case "p50k_base":
      return "GPT-3 | p50k_base";
    default:
      return encoding;
  }
};

export default async function Command() {
  let encoder: ReturnType<typeof get_encoding> | undefined;
  try {
    await initialize();
    const { tokenizer }: Preferences.TokenizeClipboard = getPreferenceValues();
    encoder = get_encoding(tokenizer);

    const clipboardText = await Clipboard.readText();

    if (!clipboardText || !clipboardText.trim()) {
      throw new Error("No text in clipboard.");
    }

    const tokens = encoder.encode(clipboardText);
    const tokenCount = tokens.length;

    await showToast({
      style: Toast.Style.Success,
      title: `${tokenCount} tokens (${getModelInfo(tokenizer)})`,
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: err instanceof Error ? `Error: ${err.message}` : `Error: Could not count tokens from clipboard`,
    });
  } finally {
    encoder?.free();
  }
}
