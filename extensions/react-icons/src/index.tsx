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
import { categories, loadCategoryIcons, getPath, getSVG, formatCategoryTitle, searchIcons } from "./utils";
import { Category, IconProps, Preferences, ReactIcon } from "./types";
import { writeFileSync } from "fs";

const { action, size, downloadDirectory }: Preferences = getPreferenceValues();

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ReactIcon[]>([]);

  const [gridDropdown, setGridDropdown] = useState<string>();
  const [category, setCategory] = useState<Category>();

  const [pinnedIcons, setPinnedIcons] = useState<string[]>([]);
  const [recentIcons, setRecentIcons] = useState<string[]>([]);

  const [refresh, setRefresh] = useState(false);
  const refreshIcons = () => setRefresh(!refresh);

  useEffect(() => {
    if (gridDropdown) {
      if (gridDropdown === "all") {
        setPinnedIcons([]);
        setRecentIcons([]);
        setCategory({ id: "all", title: "All Categories", icons: [] });
        setSearchResults(searchIcons(searchText));
      } else {
        setPinnedIcons(getPinnedIcons(gridDropdown));
        setRecentIcons(getRecentIcons(gridDropdown));
        setCategory(loadCategoryIcons(gridDropdown));
      }
    }
  }, [refresh, gridDropdown, searchText]);

  return (
    <Grid
      isLoading={category === undefined}
      columns={parseInt(size)}
      inset={Grid.Inset.Medium}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search for React Icons"}
      filtering={category?.id === "all" ? false : { keepSectionOrder: true }}
      searchBarAccessory={
        <Grid.Dropdown tooltip={"React Icons Category"} storeValue={true} onChange={setGridDropdown}>
          <Grid.Dropdown.Item title={"All Categories"} value={"all"} />
          <Grid.Dropdown.Section>
            {categories.map((category) => (
              <Grid.Dropdown.Item
                key={category.id}
                keywords={[category.id]}
                title={formatCategoryTitle(category.title)}
                value={category.title}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {category && (
        <React.Fragment>
          {category.id === "all" ? (
            searchResults.length === 0 ? (
              <Grid.EmptyView title={"Search for All React Icons"} icon={{ source: "../assets/react-icons.svg" }} />
            ) : (
              searchResults.map((reactIcon: ReactIcon, index: number) => (
                <ReactIcon
                  key={index}
                  icon={reactIcon.icon}
                  category={{ id: reactIcon.category.id, title: reactIcon.category.title, icons: [] }}
                  refresh={refreshIcons}
                />
              ))
            )
          ) : (
            <React.Fragment>
              <Grid.Section title={"Pinned Icons"}>
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
              <Grid.Section title={"Recent Icons"}>
                {recentIcons.map((icon: string) => (
                  <ReactIcon key={icon} icon={icon} category={category} refresh={refreshIcons} recent={true} />
                ))}
              </Grid.Section>
              <Grid.Section title={`${formatCategoryTitle(category.title)} (${category.icons.length})`}>
                {category.icons
                  .filter((i) => !pinnedIcons.includes(i) && !recentIcons.includes(i))
                  .map((icon: string) => (
                    <ReactIcon key={icon} icon={icon} category={category} refresh={refreshIcons} />
                  ))}
              </Grid.Section>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </Grid>
  );
}

const ReactIcon = (props: IconProps) => {
  const { icon, category, refresh } = props;
  const id = `${category.id}-${icon}}`;
  const path = getPath(icon, category.title);

  const onAction = (content: string) => {
    if (action === "Copy") {
      Clipboard.copy(content);
      showHUD(`Copied ${content}`);
    } else {
      Clipboard.paste(content);
    }
    addRecentIcon(icon, category.title);
    refresh();
  };

  const onDownload = async () => {
    const file = `${downloadDirectory}/${icon}.svg`;
    writeFileSync(file, await getSVG(path));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "SVG Icon Downloaded",
      primaryAction: {
        title: "Open Icon",
        onAction: (toast: Toast) => {
          open(file);
          toast.hide();
          closeMainWindow();
        },
      },
      secondaryAction: {
        title: "Show In Finder",
        onAction: (toast: Toast) => {
          showInFinder(file);
          toast.hide();
          closeMainWindow();
        },
      },
    };
    showToast(options);
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
          <Action title={`${action} Name`} icon={Icon.Clipboard} onAction={() => onAction(icon)} />
          <Action title={`${action} React Component`} icon={Icon.Code} onAction={() => onAction(`<${icon} />`)} />
          <Action
            title={`${action} Import Statement`}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => onAction(`import { ${icon} } from "${category.id}";`)}
          />
          <ActionPanel.Section>
            <Action
              title={"Copy SVG of Icon"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              icon={Icon.CodeBlock}
              onAction={async () => {
                Clipboard.copy(await getSVG(path));
                showHUD(`Copied SVG of Icon`);
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
