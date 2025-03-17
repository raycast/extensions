import { ActionPanel, Application, Detail, Icon, Action } from "@raycast/api";
import { JetBrainsIcon } from "../util";
import React from "react";
import { OpenJetBrainsToolbox } from "./OpenJetBrainsToolbox";

export const tbUrl = "https://jb.gg/toolbox-app";

interface HelpTextDetailProps {
  message: string[];
  toolbox: Application | undefined;
}

export function HelpTextDetail({ message, toolbox }: HelpTextDetailProps): React.JSX.Element {
  return (
    <Detail
      markdown={message.join("\n\n")}
      actions={
        <ActionPanel>
          {toolbox && <OpenJetBrainsToolbox app={toolbox} />}
          <Action.OpenInBrowser title="Open Toolbox Website" url={tbUrl} icon={JetBrainsIcon} />
          <Action.OpenInBrowser title="Open Toolbox FAQ" url={`${tbUrl}-faq`} icon={Icon.QuestionMark} />
        </ActionPanel>
      }
    />
  );
}
