import { ActionPanel, Clipboard, Action, Detail, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { useState } from "react";

export type ResourceType = "pod" | "service" | "deployment" | "ingress" | "replicaset";

export type Resource = {
  id: string;
  line: string;
  type: ResourceType;
};
export type Command = "logs" | "describe";

export interface KubectlGet {
  resource: Resource;
  command: Command;
}

const DisplayView = (display: KubectlGet) => {
  const [state, setState] = useState<string>("...");

  async function copyToClipboard() {
    await Clipboard.copy(state);
    await showHUD("Copied to Clipboard 📋");
  }

  async function showErrorMsg() {
    showHUD(`Failed, no ${display.command} available for ${display.resource.type} 😔`);
  }

  let optional = display.command == "describe" ? display.resource.type : "";

  /**
   * get list of all resources from kubectl to stdout
   *
   * e.g. kubectl describe pod mypod-abcd-efghijk
   * e.g. kubectl logs myservice
   */
  exec(`kubectl ${display.command} ${optional} ${display.resource.id}`, (err, out) => {
    if (err != null) {
      showErrorMsg();
      return;
    }

    setState(out);
  });

  return (
    <Detail
      // make sure common markdown properly renders the linebreak?
      // TODO: scroll to bottom of log file, most relevant stuff is there
      markdown={state.replaceAll("\n", "\n\n")}
      actions={
        <ActionPanel>
          <Action title="Copy" onAction={() => copyToClipboard()} />
        </ActionPanel>
      }
    />
  );
};

export default DisplayView;
