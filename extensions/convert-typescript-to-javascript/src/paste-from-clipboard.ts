import { Clipboard, showHUD } from '@raycast/api';
import { covertTypeScriptToJavaScript } from './internal/typescript-to-javascript';

export default async function main() {
  const maybeTypeScriptCode = await Clipboard.read()
    .catch(() => null)
    .then((clipboardContent) => (clipboardContent?.file ? null : clipboardContent?.text ?? null));

  if (!maybeTypeScriptCode) {
    await showHUD('No text found in clipboard');
    return;
  }

  try {
    const javascriptCode = await covertTypeScriptToJavaScript(maybeTypeScriptCode);
    await Clipboard.paste(javascriptCode);
  } catch (error) {
    if (error instanceof Error) {
      showHUD(error.message);
    } else {
      showHUD('Failed to transform TypeScript to JavaScript');
    }
  }
}
