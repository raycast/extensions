import { Action, ActionPanel, Icon } from "@raycast/api";
import { BridgeVersion } from "../interface";

interface Props {
  data: BridgeVersion;
}

const Actions = ({ data }: Props) => {
  return (
    <ActionPanel>
      <ActionPanel.Section title="GitHub">
        <Action.OpenInBrowser
          title="ProtonMail/proton-bridge"
          url="https://github.com/ProtonMail/proton-bridge"
          icon={Icon.House}
        />
        <Action.OpenInBrowser
          title="Release Link"
          url="https://github.com/ProtonMail/proton-bridge/releases/latest"
          icon={Icon.ArrowRight}
        />
        <Action.OpenInBrowser
          title="Compare Changes"
          url={`https://github.com/ProtonMail/proton-bridge/compare/v${encodeURIComponent(data.Version)}...master`}
          icon={Icon.ArrowCounterClockwise}
        />
        <Action.Paste title="Copy Version Number" content={data.Version} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Access Homepage">
        <Action.OpenInBrowser title={`Proton Bridge homepage`} url={data.LandingPage} icon={Icon.House} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default Actions;
