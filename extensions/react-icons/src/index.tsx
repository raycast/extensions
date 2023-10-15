import React, { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Icon,
  Color,
  Clipboard,
  Toast,
  showToast,
  showHUD,
  getPreferenceValues,
  open,
  showInFinder,
  closeMainWindow,
} from "@raycast/api";
import { IconStorageActions, getPinnedIcons, getRecentIcons, getPinnedMovement, addRecentIcon } from "./storage";
import { categories, loadCategory, getPath, getSVG, formatCategoryTitle, searchIcons } from "./utils";
import { Category, IconProps, Preferences, ReactIcon } from "./types";
import { writeFileSync } from "fs";

const { action, size, downloadDirectory }: Preferences = getPreferenceValues();

export default function Command() {
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const [gridDropdown, setGridDropdown] = useState<string>();
  const [category, setCategory] = useState<Category>();

  const [pinnedIcons, setPinnedIcons] = useState<string[]>([]);
  const [recentIcons, setRecentIcons] = useState<string[]>([]);

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  const [searchResults, setSearchResults] = useState<ReactIcon[]>([]);

  useEffect(() => {
    if (gridDropdown) {
      setLoading(true);
      if (gridDropdown === "all") {
        setPinnedIcons([]);
        setRecentIcons([]);
        setCategory({ id: "all", title: "All Categories", icons: [] });
        setSearchResults(searchIcons(searchText));
      } else {
        setPinnedIcons(getPinnedIcons(gridDropdown));
        setRecentIcons(getRecentIcons(gridDropdown));
        setCategory(loadCategory(gridDropdown));
      }
      setLoading(false);
    }
  }, [refresh, gridDropdown, searchText]);

  return (
    <Grid
      isLoading={loading}
      columns={parseInt(size)}
      inset={Grid.Inset.Medium}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for React Icons"}
      filtering={category?.id !== "all"}
      searchBarAccessory={
        <Grid.Dropdown tooltip="React Icons Category" storeValue onChange={setGridDropdown}>
          <Grid.Dropdown.Item title={"All Categories"} value={"all"} />
          <Grid.Dropdown.Section>
            {categories.map((category: string) => (
              <Grid.Dropdown.Item key={category} title={formatCategoryTitle(category)} value={category} />
            ))}
          </Grid.Dropdown.Section>
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
      {category &&
        (category.id === "all" ? (
          searchResults.length > 0 ? (
            searchResults.map((reactIcon: ReactIcon, index: number) => (
              <ReactIcon
                key={index}
                icon={reactIcon.icon}
                category={{ id: reactIcon.category.id, title: reactIcon.category.title, icons: [] }}
                refresh={refreshIcons}
              />
            ))
          ) : (
            <Grid.EmptyView title={"Search for all React Icons"} icon={"../assets/react-icons.svg"} />
          )
        ) : (
          <Grid.Section title={formatCategoryTitle(category.title)}>
            {category.icons.map((icon: string) => (
              <ReactIcon key={icon} icon={icon} category={category} refresh={refreshIcons} />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}

const ReactIcon = (props: IconProps) => {
  const { icon, category, pinned, recent, refresh } = props;
  const id = `${pinned ? "pinned-" : ""}${recent ? "recent-" : ""}${category.id}-${icon}}`;
  const path = getPath(icon, category.title);

  const onAction = async (content: string) => {
    if (action === "Copy") {
      await Clipboard.copy(content);
      await showHUD(`Copied ${content}`);
    } else {
      await Clipboard.paste(content);
    }
    addRecentIcon(icon, category.title);
    refresh();
  };

  const onDownload = async () => {
    const svg = await getSVG(path);
    const file = `${downloadDirectory}/${icon}.svg`;
    writeFileSync(file, svg);
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "SVG Icon Downloaded",
      primaryAction: {
        title: "Open Icon",
        onAction: async (toast: Toast) => {
          await open(file);
          await toast.hide();
          await closeMainWindow();
        },
      },
      secondaryAction: {
        title: "Show In Finder",
        onAction: async (toast: Toast) => {
          await showInFinder(file);
          await toast.hide();
          await closeMainWindow();
        },
      },
    };
    await showToast(options);
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
          <Action title={`${action} Name`} icon={Icon.Clipboard} onAction={async () => onAction(icon)} />
          <Action title={`${action} React Component`} icon={Icon.Code} onAction={async () => onAction(`<${icon} />`)} />
          <Action
            title={`${action} Import Statement`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            icon={Icon.Code}
            onAction={async () => onAction(`import { ${icon} } from "${category.id}";`)}
          />
          <ActionPanel.Section>
            <Action
              title={"Copy SVG of Icon"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              icon={Icon.CodeBlock}
              onAction={async () => {
                const svg = await getSVG(path);
                await Clipboard.copy(svg);
                await showHUD(`Copied SVG of Icon`);
                addRecentIcon(icon, category.title);
                refresh();
              }}
            />
            <Action
              title={"Download SVG Icon"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              icon={Icon.Download}
              onAction={onDownload}
            />
          </ActionPanel.Section>
          <IconStorageActions {...props} />
        </ActionPanel>
      }
    />
  );
};
