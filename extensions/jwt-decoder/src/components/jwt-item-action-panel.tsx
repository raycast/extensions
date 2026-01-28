import { JWSHeaderParameters, JWTPayload } from "jose";
import { TokenItem } from "../utils/list-from-object";
import { Action, ActionPanel, Icon } from "@raycast/api";

interface JwtItemActionPanelProps {
  data: JWTPayload;
  header: JWSHeaderParameters;
  showDetail: boolean;
  toggleShowDetail: () => void;
  item: TokenItem;
}

export function JwtItemActionPanel({ data, header, showDetail, toggleShowDetail, item }: JwtItemActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title={`Copy ${item.key}`} content={item.value} />
        <Action
          icon={showDetail ? Icon.List : Icon.Sidebar}
          title={`${showDetail ? "Hide" : "Show"} Detail`}
          onAction={toggleShowDetail}
        />
        <Action.CopyToClipboard title={`Copy Payload JSON`} content={JSON.stringify(data, null, 2)} />
        <Action.CopyToClipboard title={`Copy Header JSON`} content={JSON.stringify(header, null, 2)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
