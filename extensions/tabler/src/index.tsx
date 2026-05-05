import { Action, ActionPanel, Grid, Color, showToast, Toast, showInFinder } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

type Styles = {
  outline?: { version: string; unicode: string; svg: string };
  filled?: { version: string; unicode: string; svg: string };
};

type TablerIcon = {
  name: string;
  svg?: string;
  tags: string[];
  category: string;
  url?: string;
  version?: string;
  unicode?: string;
  styles?: Styles;
};

const Outline = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/outline/";
const Filled = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/filled/";

const downloadSVG = async (svgContent: string, name: string) => {
  const filename = `${name}.svg`;
  const path = join(homedir(), "Downloads", filename);

  try {
    const toast = await showToast(Toast.Style.Animated, "Downloading Icon", "Please wait...");

    await writeFile(path, svgContent);

    toast.title = "Downloaded";
    toast.message = filename;
    toast.style = Toast.Style.Success;

    await showInFinder(path);
  } catch (error) {
    await showFailureToast(error, { title: "Download Failed" });
  }
};

type StyleFilter = "all" | "outline" | "filled";

type FetchResult = {
  icons: TablerIcon[];
  pagination: { hasNextPage: boolean; totalIcons: number };
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      const params = new URLSearchParams();
      if (searchText) {
        params.append("search", searchText);
      }
      if (styleFilter !== "all") {
        params.append("style", styleFilter);
      }
      params.append("page", String(options.page + 1));
      return `https://tabler.io/api/icons?${params.toString()}`;
    },
    {
      keepPreviousData: true,
      initialData: [],
      mapResult(result: FetchResult) {
        return {
          data: result.icons,
          hasMore: result.pagination.hasNextPage,
        };
      },
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      inset={Grid.Inset.Large}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Style"
          value={styleFilter}
          onChange={(value) => setStyleFilter(value as StyleFilter)}
        >
          <Grid.Dropdown.Item title="All Styles" value="all" />
          <Grid.Dropdown.Item title="Outline" value="outline" />
          <Grid.Dropdown.Item title="Filled" value="filled" />
        </Grid.Dropdown>
      }
      pagination={pagination}
    >
      {data.map((tablerIcon) => {
        const outline = tablerIcon.styles?.outline?.svg;
        const filled = tablerIcon.styles?.filled?.svg;
        return (
          <Grid.Item
            key={tablerIcon.name}
            title={tablerIcon.name}
            content={Outline + tablerIcon.name + ".svg"}
            accessory={
              filled
                ? {
                    tooltip: "Filled Version Available",
                    icon: {
                      source: Filled + tablerIcon.name + ".svg",
                      tintColor: {
                        light: Color.SecondaryText,
                        dark: Color.SecondaryText,
                      },
                    },
                  }
                : undefined
            }
            actions={
              <ActionPanel>
                {outline && (
                  <Action.CopyToClipboard
                    title="Copy Outline SVG"
                    content={outline}
                    icon={Outline + tablerIcon.name + ".svg"}
                  />
                )}
                {outline && (
                  <Action
                    title="Download Outline SVG"
                    icon={Outline + tablerIcon.name + ".svg"}
                    onAction={() => downloadSVG(outline, tablerIcon.name)}
                  />
                )}
                {filled && (
                  <Action.CopyToClipboard
                    title="Copy Filled SVG"
                    content={filled}
                    icon={Filled + tablerIcon.name + ".svg"}
                    shortcut={{ modifiers: ["opt"], key: "return" }}
                  />
                )}
                {filled && (
                  <Action
                    title="Download Filled SVG"
                    icon={Filled + tablerIcon.name + ".svg"}
                    onAction={() => downloadSVG(filled, tablerIcon.name)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "return" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={tablerIcon.name}
                  shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                />
                {tablerIcon.styles?.outline?.unicode && (
                  <Action.CopyToClipboard
                    title="Copy Outline HTML Char"
                    content={`&#x${tablerIcon.styles.outline.unicode};`}
                  />
                )}
                {tablerIcon.styles?.filled?.unicode && (
                  <Action.CopyToClipboard
                    title="Copy Filled HTML Char"
                    content={`&#x${tablerIcon.styles.filled.unicode};`}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && data.length === 0 && (
        <Grid.EmptyView title="No Icons Found" description="Try a different search term" />
      )}
    </Grid>
  );
}
