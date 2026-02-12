// @ts-nocheck - Raycast API type system compatibility layer
import { List, Grid } from "@raycast/api";
import { layout } from "./preferences";

interface ListOrGridCommonProps {
  columns?: number;
  inset?: Grid.Inset;
  searchBarPlaceholder?: string;
  isLoading?: boolean;
  filtering?: { keepSectionOrder: boolean };
  searchBarAccessory?: unknown;
  children?: unknown;
}

interface AccessoryTag {
  value: string;
  color: string | { light: string; dark: string; adjustContrast?: boolean };
}

interface Accessory {
  tag?: AccessoryTag;
  tooltip?: string;
}

export function ListOrGrid(props: ListOrGridCommonProps) {
  if (layout === "grid") {
    // Grid doesn't support dropdown in searchBarAccessory
    // @ts-ignore Raycast API compatibility - unknown children type
    const gridChildren = props.children;
    return (
      <Grid
        columns={props.columns}
        inset={props.inset}
        searchBarPlaceholder={props.searchBarPlaceholder}
        isLoading={props.isLoading}
        filtering={props.filtering}
      >
        {gridChildren}
      </Grid>
    );
  }

  // @ts-ignore Raycast API compatibility - unknown searchBarAccessory type
  const searchAccessory = props.searchBarAccessory;
  // @ts-ignore Raycast API compatibility - unknown children type
  const listChildren = props.children;
  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      isLoading={props.isLoading}
      filtering={props.filtering}
      searchBarAccessory={searchAccessory}
    >
      {listChildren}
    </List>
  );
}

export function ListOrGridSection(props: {
  title?: string;
  children?: unknown;
}) {
  // @ts-ignore Raycast API compatibility - unknown children type
  const sectionChildren = props.children;
  if (layout === "grid") {
    return <Grid.Section title={props.title}>{sectionChildren}</Grid.Section>;
  }

  return <List.Section title={props.title}>{sectionChildren}</List.Section>;
}

interface ListOrGridItemProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: string | { fileIcon: string };
  content?: string | { fileIcon: string };
  keywords?: string[];
  accessories?: Accessory[];
  actions?: unknown;
}

export function ListOrGridItem(props: ListOrGridItemProps) {
  // @ts-ignore Raycast API compatibility - unknown actions type
  const itemActions = props.actions;
  if (layout === "grid") {
    const contentValue =
      typeof props.content === "string"
        ? props.content
        : props.content?.fileIcon || "";
    return (
      <Grid.Item
        id={props.id}
        title={props.title}
        subtitle={props.subtitle}
        content={contentValue}
        keywords={props.keywords}
        actions={itemActions}
      />
    );
  }

  const iconValue =
    typeof props.icon === "string" ? { fileIcon: props.icon } : props.icon;
  const colorToString = (color: AccessoryTag["color"]): string => {
    if (typeof color === "string") return color;
    return color.light;
  };

  return (
    <List.Item
      id={props.id}
      title={props.title}
      subtitle={props.subtitle}
      icon={iconValue}
      keywords={props.keywords}
      accessories={
        props.accessories?.map((acc) => ({
          tag: acc.tag
            ? { value: acc.tag.value, color: colorToString(acc.tag.color) }
            : undefined,
          tooltip: acc.tooltip,
        })) || []
      }
      actions={itemActions}
    />
  );
}

export function ListOrGridDropdown(props: {
  tooltip?: string;
  defaultValue?: string;
  storeValue?: boolean;
  onChange?: (value: string) => void;
  children?: unknown;
}) {
  // Grid doesn't support dropdown in searchBar, only List does
  // When in Grid mode, filtering by type won't work via dropdown
  const dropdownProps: {
    tooltip?: string;
    defaultValue?: string;
    storeValue?: boolean;
    onChange?: (value: string) => void;
  } = {};
  if (props.tooltip) dropdownProps.tooltip = props.tooltip;
  if (props.defaultValue) dropdownProps.defaultValue = props.defaultValue;
  if (props.storeValue !== undefined)
    dropdownProps.storeValue = props.storeValue;
  if (props.onChange) dropdownProps.onChange = props.onChange;

  // @ts-ignore Raycast API compatibility - unknown children type
  const dropdownChildren = props.children;
  return <List.Dropdown {...dropdownProps}>{dropdownChildren}</List.Dropdown>;
}

export function ListOrGridDropdownItem(props: {
  title: string;
  value: string;
}) {
  return <List.Dropdown.Item title={props.title} value={props.value} />;
}

export function ListOrGridDropdownSection(props: { children?: unknown }) {
  // @ts-ignore Raycast API compatibility - unknown children type
  const sectionChildren = props.children;
  return <List.Dropdown.Section>{sectionChildren}</List.Dropdown.Section>;
}
