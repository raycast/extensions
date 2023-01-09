import { Clipboard, popToRoot, closeMainWindow, showToast, Toast } from '@raycast/api';
import { useEffect } from 'react';

export default () => {
  useEffect(() => {
    main();
    async function main() {
      try {
        const clipboardText = (await Clipboard.readText()) as string;
        const trimmedText = clipboardText.trim();
        let jsObject = parseJson(trimmedText);
        if (!jsObject) {
          eval(`jsObject = ${trimmedText}`);
        }
        await Clipboard.paste(JSON.stringify(jsObject, null, 2));
        closeMainWindow();
        popToRoot();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid',
          message: 'clipboard value is not valid JSON or JS Object',
        });
        popToRoot();
      }
    }

    function parseJson(input: string) {
      try {
        return JSON.parse(input);
      } catch (err) {
        return;
      }
    }
  });
};
