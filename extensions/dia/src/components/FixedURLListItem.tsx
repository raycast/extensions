import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getSubtitle } from "../utils";

const DIA_BUNDLE_ID = "company.thebrowser.dia";

interface FixedURLListItemProps {
  fixedUrl: string;
}

export function FixedURLListItem({ fixedUrl }: FixedURLListItemProps) {
  return (
    <List.Item
      icon={getFavicon(fixedUrl)}
      title="Open fixed URL"
      subtitle={getSubtitle(fixedUrl)}
      accessories={[{ icon: Icon.Wand, tooltip: "URL was broken across lines" }]}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.Globe}
            title="Open in Dia"
            target={fixedUrl}
            application={DIA_BUNDLE_ID}
            onOpen={async () => {
              await closeMainWindow();
            }}
          />
          <Action.CopyToClipboard content={fixedUrl} title="Copy Fixed URL" shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}
