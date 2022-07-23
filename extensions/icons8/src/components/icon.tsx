import { Grid, ActionPanel, Action, Color } from "@raycast/api";
import { DownloadSVGIcon, DownloadPNGIcon } from "./actions";
import { IconDetail } from "./icon-detail";
import { Icon8 } from "../types/types";

export const Icon8Item = (icon: Icon8): JSX.Element => {
  return (<Grid.Item
    key={icon.id}
    content={{
      value: { source: icon.url, tintColor: icon.color ? null : Color.PrimaryText },
      tooltip: icon.name,
    }}
    subtitle={icon.name}
    actions={
      <ActionPanel>
        <Action.Push
          title="View Icon"
          target={<IconDetail icon={icon} />}
          icon={{ source: icon.url, tintColor: icon.color ? null : Color.PrimaryText }}
        />
        <Action.OpenInBrowser
          url={icon.link}
          icon={{ source: "../assets/Icons8-Open.png", tintColor: Color.PrimaryText }}
        />
        <Action.CopyToClipboard content={icon.name} />
        <ActionPanel.Section>
          <DownloadSVGIcon icon={icon} />
          <DownloadPNGIcon icon={icon} />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />)
};