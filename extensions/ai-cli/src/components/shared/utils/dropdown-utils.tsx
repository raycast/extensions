import { Form, Icon } from "@raycast/api";
import { getSecureEntityIcon } from "@/utils/validation";
import { UI_CONSTANTS } from "@/constants/ui";
import { JSX } from "react";

interface EntityWithIcon {
  id: string;
  name: string;
  icon?: string;
}

interface DropdownItemConfig<T extends EntityWithIcon> {
  items: T[];
  fallbackIcon?: Icon | string;
  priorityItemId?: string;
}

/**
 * Renders an array of Form.Dropdown.Item components with optional priority ordering
 */
export const renderDropdownItems = <T extends EntityWithIcon>(config: DropdownItemConfig<T>): JSX.Element[] => {
  const { items, fallbackIcon = UI_CONSTANTS.DEFAULT_ENTITY_ICON, priorityItemId } = config;

  // Separate priority items (rendered first) from other items
  const priorityItems = priorityItemId ? items.filter((item) => item.id === priorityItemId) : [];
  const otherItems = priorityItemId ? items.filter((item) => item.id !== priorityItemId) : items;

  // Helper function to render a single dropdown item
  const renderItem = (item: T) => (
    <Form.Dropdown.Item
      key={item.id}
      value={item.id}
      title={item.name}
      icon={getSecureEntityIcon(item.icon, fallbackIcon)}
    />
  );

  return [
    // Render priority items first
    ...priorityItems.map(renderItem),
    // Then render all other items
    ...otherItems.map(renderItem),
  ];
};
