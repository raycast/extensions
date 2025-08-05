import { Action, ActionPanel, List } from "@raycast/api";
import { EBIRD_URL } from "../constants/config";
import { EBirdTaxon } from "../types/ebird";
import { tagByCategory } from "../utils/tagByCategory";

export default function TaxonListItem({ taxon }: { taxon: EBirdTaxon }) {
  const accessories = [];

  accessories.push({ tag: tagByCategory[taxon.category] });

  return (
    <List.Item
      title={taxon.comName}
      subtitle={taxon.familyComName}
      icon={"🪶"}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={`${EBIRD_URL}/${taxon.speciesCode}`} />
            <Action.CopyToClipboard
              title="Copy Common Name"
              content={taxon.comName}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
