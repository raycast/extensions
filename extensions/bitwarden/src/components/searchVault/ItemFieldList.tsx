import { List } from "@raycast/api";
import { useState } from "react";
import { Item, ItemType } from "~/types/vault";
import { BaseItemField } from "./BaseItemField";
import HiddenItemField from "./HiddenItemField";
import LinkItemField from "./LinkItemField";
import TextItemField from "./TextItemField";
import TotpItemField from "./TotpItemField";
import { ItemField } from "./types/item-field";
import { buildFieldSections } from "./utils/buildFieldSections";

type ItemFieldListProps = {
  item: Item;
  folderName?: string;
};

/**
 * Renders the complete field list for a vault item, grouped into titled sections.
 *
 * Uses {@link buildFieldSections} to transform the item into an ordered array of
 * sections, then maps each field to its type-specific component:
 * - `"text"`   → {@link TextItemField}
 * - `"link"`   → {@link LinkItemField}
 * - `"hidden"` → {@link HiddenItemField}
 * - `"totp"`   → {@link TotpItemField}
 *
 * The detail side-panel defaults to open for `NOTE` items (whose primary content
 * is the notes body) and closed for all other types.
 *
 * @param props - See {@link ItemFieldListProps}.
 * @param props.item - The fully-loaded vault item whose fields should be rendered.
 * @param props.folderName - Optional folder name prepended to the navigation title
 *        (e.g. `"/Work/GitHub"`) for breadcrumb context.
 * @returns A Raycast `List` with sectioned field rows, or an empty-state view when
 *          the item has no displayable fields.
 */
function ItemFieldList({ item, folderName }: ItemFieldListProps) {
  const [detailPanelOpen, setDetailPanelOpen] = useState(item.type === ItemType.NOTE);

  const navigationTitle = `${folderName ? "/" + folderName : ""}/${item.name}`;
  const sections = buildFieldSections(item);

  function toggleDetailPanel() {
    setDetailPanelOpen((prev) => !prev);
  }

  if (sections.length === 0) {
    return (
      <List navigationTitle={navigationTitle} searchBarPlaceholder="">
        <List.EmptyView title="No fields to display" description="This item has no displayable fields." />
      </List>
    );
  }

  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter fields" isShowingDetail={detailPanelOpen}>
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.fields.map((field) => {
            switch (field.type) {
              case "text":
                return <TextItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "link":
                return <LinkItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "hidden":
                return <HiddenItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "totp":
                return <TotpItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              default:
                <BaseItemField
                  key={(field as ItemField).id}
                  id={(field as ItemField).id}
                  label={(field as ItemField).label}
                  displayValue={(field as ItemField).displayValue ?? (field as ItemField).value}
                  detailValue={(field as ItemField).value}
                  onToggleDetailPanel={toggleDetailPanel}
                />;
            }
          })}
        </List.Section>
      ))}
    </List>
  );
}

export default ItemFieldList;
