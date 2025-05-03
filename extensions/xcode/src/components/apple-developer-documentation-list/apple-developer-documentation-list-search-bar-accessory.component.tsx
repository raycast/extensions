import { AppleDeveloperDocumentationEntryType } from "../../models/apple-developer-documentation/apple-developer-documentation-entry-type.model";
import { Icon, List } from "@raycast/api";
import { AppleDeveloperDocumentationEntryTypeName } from "../../shared/apple-developer-documentation-entry-type-name";
import { AppleDeveloperDocumentationEntryTypeIcon } from "../../shared/apple-developer-documentation-entry-type-icon";

/**
 * Apple Developer Documentation List Search Bar Accessory
 */
export function AppleDeveloperDocumentationListSearchBarAccessory(props: {
  onChange: (entryType: AppleDeveloperDocumentationEntryType | undefined) => void;
}) {
  return (
    <List.Dropdown
      onChange={(entryType) =>
        props.onChange(
          entryType
            ? AppleDeveloperDocumentationEntryType[entryType as keyof typeof AppleDeveloperDocumentationEntryType]
            : undefined
        )
      }
      tooltip="Filter entries by type"
    >
      <List.Dropdown.Item key="all" value="" icon={Icon.BlankDocument} title="All" />
      {Object.keys(AppleDeveloperDocumentationEntryType).map((entryType) => (
        <List.Dropdown.Item
          key={entryType}
          value={entryType}
          icon={AppleDeveloperDocumentationEntryTypeIcon(
            AppleDeveloperDocumentationEntryType[entryType as keyof typeof AppleDeveloperDocumentationEntryType]
          )}
          title={AppleDeveloperDocumentationEntryTypeName(
            AppleDeveloperDocumentationEntryType[entryType as keyof typeof AppleDeveloperDocumentationEntryType]
          )}
        />
      ))}
    </List.Dropdown>
  );
}
