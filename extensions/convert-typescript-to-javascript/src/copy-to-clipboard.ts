import { Clipboard, getSelectedText, showHUD } from '@raycast/api';
import { covertTypeScriptToJavaScript } from './internal/typescript-to-javascript';

export default async function main() {
  const typescriptCode = await getSelectedText().catch(() => null);
  if (!typescriptCode) {
    await showHUD('No text found in clipboard');
    return;
  }

  const javascriptCode = await covertTypeScriptToJavaScript(typescriptCode);

  await Clipboard.copy(javascriptCode);
  await showHUD('Copied code to clipboard');
}
