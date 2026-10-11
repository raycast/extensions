import { chmod, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  Action,
  ActionPanel,
  Detail,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fmLicenseText } from "./fm";

// The agreement is answered by the user in Terminal, never on their behalf.
export async function openLicenseInTerminal() {
  const script = join(tmpdir(), "quill-fm-license.command");
  await writeFile(script, "#!/bin/zsh\n/usr/bin/fm license\n");
  await chmod(script, 0o755);
  await open(script);
}

export async function showLicenseToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Accept Apple's terms first",
    message: "Answer the prompt in Terminal, then run the command again.",
    primaryAction: {
      title: "Accept Terms in Terminal",
      onAction: openLicenseInTerminal,
    },
  });
}

export function LicenseDetail() {
  const { data, isLoading } = usePromise(fmLicenseText);
  return (
    <Detail
      isLoading={isLoading}
      markdown={`## Apple Foundation Models terms\n\nAccept the terms once to use this extension.\n\n\`\`\`\n${data ?? ""}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Accept Terms in Terminal"
            onAction={openLicenseInTerminal}
          />
        </ActionPanel>
      }
    />
  );
}
