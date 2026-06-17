import { Action, ActionPanel, Color, List } from "@raycast/api";

import { ItchModel } from "../interface/itchModel";
import { renderDetails } from "./generateDetails";

export function SearchListItem({ searchResult }: { searchResult: ItchModel }) {
  return (
    <List.Item
      title={searchResult.plainTitle}
      icon={{
        tintColor: searchResult.price == "$0.00" ? Color.SecondaryText : Color.Green,
        source: "money.svg",
      }}
      detail={<List.Item.Detail markdown={renderDetails(searchResult)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
