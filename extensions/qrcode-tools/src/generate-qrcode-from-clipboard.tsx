import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useAsync } from "react-use";
import { readText } from "./clipboard";
import { generateQRCodeToFile } from "./qrcode";
import path from "path";
import os from "os";
import fs from "fs";
import { popToRoot } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { ErrorView } from "./error-view";
import { useCallbackWithToast } from "./hooks";

export default function Command() {
  const state = useAsync(async () => {
    const text = await readText();
    const tempPath = await generateQRCodeToFile(text);
    return {
      text,
      tempPath,
    };
  }, []);

  const saveFileAction = useCallbackWithToast(async () => {
    await fs.promises.copyFile(
      state.value!.tempPath,
      path.join(os.homedir(), "Downloads", `raycase-qrcode-tools-${Date.now()}.png`)
    );
    await showHUD("Saved to Downloads");
    await popToRoot();
  }, []);

  if (state.error) {
    return <ErrorView error={state.error} />;
  }

  const markdown =
    !state.loading && state.value
      ? `
![](${state.value.tempPath})

\`\`\`text
${state.value.text}
\`\`\`
  `.trim()
      : `Generating`;

  return (
    <Detail
      isLoading={state.loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={{ file: state.value?.tempPath ?? "" }} />
          <Action onAction={saveFileAction} title="Save to Downloads" icon={Icon.SaveDocument}></Action>
        </ActionPanel>
      }
    />
  );
}
