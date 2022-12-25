import React, { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon, Color, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { IconStorageActions, getPinnedIcons, getRecentIcons, getPinnedMovement, addRecentIcon } from "./storage";
import { categories, loadCategory, getPath, getSVG, formatCategoryTitle } from "./utils";
import { Category, IconProps, Preferences } from "./types";

const { action }: Preferences = getPreferenceValues();

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const [dropdown, setDropdown] = useState<string>();
  const [category, setCategory] = useState<Category>();

  const [pinnedIcons, setPinnedIcons] = useState<string[]>([]);
  const [recentIcons, setRecentIcons] = useState<string[]>([]);

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  useEffect(() => {
    if (dropdown) {
      setPinnedIcons(getPinnedIcons(dropdown));
      setRecentIcons(getRecentIcons(dropdown));
      setCategory(loadCategory(dropdown));
    }
  }, [refresh, dropdown]);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Medium}
      isLoading={category === undefined}
      onSearchTextChange={setSearchText}
      filtering={true}
      searchBarAccessory={
        <Grid.Dropdown tooltip="React Icons Category" storeValue onChange={setDropdown}>
          {categories.map((category: string) => (
            <Grid.Dropdown.Item key={category} title={formatCategoryTitle(category)} value={category} />
          ))}
        </Grid.Dropdown>
      }
    >
      {category && searchText === "" && (
        <React.Fragment>
          <Grid.Section title="Pinned Icons">
            {pinnedIcons.map((icon: string) => (
              <ReactIcon
                key={icon}
                icon={icon}
                category={category}
                refresh={refreshIcons}
                movement={getPinnedMovement(pinnedIcons, icon)}
                pinned={true}
              />
            ))}
          </Grid.Section>
          <Grid.Section title="Recent Icons">
            {recentIcons.map((icon: string) => (
              <ReactIcon key={icon} icon={icon} category={category} refresh={refreshIcons} recent={true} />
            ))}
          </Grid.Section>
        </React.Fragment>
      )}
      {category && (
        <Grid.Section title={formatCategoryTitle(category.title)}>
          {category.icons.map((icon: string, index: number) => (
            <ReactIcon key={index} icon={icon} category={category} refresh={refreshIcons} />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

const ReactIcon = (props: IconProps) => {
  const { icon, category, pinned, recent, refresh } = props;
  const id = `${pinned && "pinned"}${recent && "recent"}${icon}}`;
  const path = getPath(icon, category.title);

  const onAction = async (content: string, message?: string) => {
    if (action === "Copy") {
      await Clipboard.copy(content);
      await showHUD(`Copied ${message ? message : content}`);
    } else {
      await Clipboard.paste(content);
    }
    addRecentIcon(icon, category.title);
    refresh();
  };

  return (
    <Grid.Item
      id={id}
      title={icon}
      content={{ value: { source: path, tintColor: Color.PrimaryText }, tooltip: icon }}
      actions={
        <ActionPanel title={icon}>
          <Action
            title={action === "Copy" ? "Copy Name to Clipboard" : "Paste Name"}
            icon={Icon.Clipboard}
            onAction={async () => onAction(icon)}
          />
          <Action
            title={action === "Copy" ? "Copy React Component to Clipboard" : "Paste React Component"}
            icon={Icon.Code}
            onAction={async () => onAction(`<${icon} />`)}
          />
          <Action
            title={action === "Copy" ? "Copy Import Statement to Clipboard" : "Paste Import Statement"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            icon={Icon.Code}
            onAction={async () => onAction(`import { ${icon} } from "${category.id}";`)}
          />
          <Action
            title={action === "Copy" ? "Copy SVG to Clipboard" : "Paste SVG"}
            shortcut={{ modifiers: ["cmd", "shift"], key: action === "Copy" ? "c" : "v" }}
            icon={Icon.CodeBlock}
            onAction={async () => onAction(getSVG(path), "SVG")}
          />
          <IconStorageActions {...props} />
        </ActionPanel>
      }
    />
  );
};
