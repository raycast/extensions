import { Action, ActionPanel, Clipboard, Color, Grid, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useMemo, useState } from "react";
import iconMetadata from "./sanity-icons.json";

type Styles = {
  outline?: { version: string; unicode: string; svg: string };
  filled?: { version: string; unicode: string; svg: string };
};

type SanityIcon = {
  name: string;
  svg?: string;
  tags: string[];
  category: string;
  url?: string;
  version?: string;
  unicode?: string;
  styles?: Styles;
};

const BASE_URL = "https://raw.githubusercontent.com/sanity-io/icons/main/export/";

const fetchSvgContent = async (name: string): Promise<string> => {
  const response = await fetch(BASE_URL + name + ".svg");
  if (!response.ok) {
    throw new Error(`Failed to fetch icon: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const downloadSVG = async (name: string) => {
  const filename = `${name}.svg`;
  const path = join(homedir(), "Downloads", filename);

  try {
    const toast = await showToast(Toast.Style.Animated, "Downloading Icon", "Please wait...");

    const svgContent = await fetchSvgContent(name);

    await writeFile(path, svgContent);

    toast.title = "Downloaded";
    toast.message = filename;
    toast.style = Toast.Style.Success;

    await showInFinder(path);
  } catch (error) {
    await showFailureToast(error, { title: "Download Failed" });
  }
};

const metadataMap = new Map<string, { category: string; tags: string[] }>();
for (const entry of iconMetadata) {
  metadataMap.set(entry.name, { category: entry.category, tags: entry.tags });
}

type StyleFilter = "all" | "outline" | "filled";

type GitHubItem = {
  name: string;
  type: string;
};

function getMetadata(name: string): { category: string; tags: string[] } {
  const meta = metadataMap.get(name);
  return meta ? { category: meta.category, tags: [...meta.tags] } : { category: "", tags: [] };
}

function groupIcons(names: string[]): SanityIcon[] {
  const filledSet = new Set<string>();
  const outlineSet = new Set<string>();
  const standaloneSet = new Set<string>();

  for (const name of names) {
    if (name.endsWith("-filled")) {
      filledSet.add(name.slice(0, -7));
    } else if (name.endsWith("-outline")) {
      outlineSet.add(name.slice(0, -8));
    } else {
      standaloneSet.add(name);
    }
  }

  const allBases = new Set([...filledSet, ...outlineSet, ...standaloneSet]);
  const icons: SanityIcon[] = [];

  for (const base of allBases) {
    const hasFilled = filledSet.has(base);
    const hasOutline = outlineSet.has(base);
    const hasStandalone = standaloneSet.has(base);

    const meta = getMetadata(base);
    if (hasFilled && (hasOutline || hasStandalone)) {
      const icon: SanityIcon = { name: base, tags: meta.tags, category: meta.category, styles: {} };
      icon.styles!.outline = { version: "", unicode: "", svg: hasOutline ? base + "-outline" : base };
      icon.styles!.filled = { version: "", unicode: "", svg: base + "-filled" };
      icons.push(icon);
    } else if (hasFilled) {
      icons.push({
        name: base,
        tags: meta.tags,
        category: meta.category,
        styles: { filled: { version: "", unicode: "", svg: base + "-filled" } },
      });
    } else if (hasOutline) {
      icons.push({
        name: base,
        tags: meta.tags,
        category: meta.category,
        styles: { outline: { version: "", unicode: "", svg: base + "-outline" } },
      });
    } else {
      icons.push({ name: base, tags: meta.tags, category: meta.category, svg: base });
    }
  }

  return icons;
}

function getDisplayFilename(icon: SanityIcon): string {
  if (icon.styles?.outline?.svg) return icon.styles.outline.svg;
  if (icon.styles?.filled?.svg) return icon.styles.filled.svg;
  return icon.svg || icon.name;
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function getComponentName(name: string): string {
  return toPascalCase(name) + "Icon";
}

function getImportStatement(name: string): string {
  return `import {${getComponentName(name)}} from '@sanity/icons'`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");

  const {
    isLoading,
    data: iconNames,
    error,
  } = useFetch<string[], string[]>("https://api.github.com/repos/sanity-io/icons/contents/export", {
    keepPreviousData: true,
    initialData: [],
    parseResponse: async (response) => {
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;
        if (body !== null && typeof body === "object" && !Array.isArray(body) && "message" in body) {
          const maybeMessage = (body as Record<string, unknown>).message;
          if (typeof maybeMessage === "string") {
            message = maybeMessage;
          }
        }
        if (message.toLowerCase().includes("rate limit")) {
          throw new Error("GitHub API rate limit exceeded. Authenticate or try again later.");
        }
        throw new Error(`GitHub API error: ${message}`);
      }

      if (!Array.isArray(body)) {
        return [];
      }
      const items = (body as Array<unknown>).filter(
        (item): item is GitHubItem =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          typeof (item as Record<string, unknown>).type === "string" &&
          "name" in item &&
          typeof (item as Record<string, unknown>).name === "string",
      );

      return items
        .filter((item) => item.type === "file" && item.name.endsWith(".svg"))
        .map((item) => item.name.replace(/\.svg$/, ""));
    },
  });

  useEffect(() => {
    if (error) {
      void showFailureToast(error, { title: "Failed to fetch icons" });
    }
  }, [error]);

  const icons = useMemo(() => {
    return groupIcons(iconNames).sort((a, b) => a.name.localeCompare(b.name));
  }, [iconNames]);

  const filteredIcons = useMemo(() => {
    let result = icons;
    if (styleFilter === "outline") {
      result = result.filter((icon) => icon.styles?.outline || !icon.styles);
    } else if (styleFilter === "filled") {
      result = result.filter((icon) => icon.styles?.filled);
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter((icon) => {
        if (icon.name.toLowerCase().includes(query)) return true;
        if (icon.category.toLowerCase().includes(query)) return true;
        if (icon.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
        return false;
      });
    }
    return result;
  }, [icons, styleFilter, searchText]);

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
    >
      {filteredIcons.map((sanityIcon) => {
        const outline = sanityIcon.styles?.outline?.svg;
        const filled = sanityIcon.styles?.filled?.svg;
        return (
          <Grid.Item
            key={sanityIcon.name}
            title={sanityIcon.name}
            content={{
              source: BASE_URL + getDisplayFilename(sanityIcon) + ".svg",
              tintColor: {
                light: "#000000",
                dark: "#FFFFFF",
              },
            }}
            accessory={
              filled
                ? {
                    tooltip: "Filled Version Available",
                    icon: {
                      source: BASE_URL + sanityIcon.styles!.filled!.svg + ".svg",
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
                <Action.CopyToClipboard title="Copy Name" content={outline || filled || sanityIcon.name} />
                <Action.CopyToClipboard
                  title="Copy React Import"
                  content={getImportStatement(outline || filled || sanityIcon.name)}
                />
                <Action.CopyToClipboard
                  title="Copy React Component Name"
                  content={getComponentName(outline || filled || sanityIcon.name)}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                {filled && <Action.CopyToClipboard title="Copy Filled Name" content={filled} />}
                {filled && (
                  <Action.CopyToClipboard title="Copy Filled React Import" content={getImportStatement(filled)} />
                )}
                {filled && (
                  <Action.CopyToClipboard title="Copy Filled React Component Name" content={getComponentName(filled)} />
                )}
                {outline && (
                  <Action
                    title="Copy Outline SVG"
                    icon={{
                      source: BASE_URL + outline + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={async () => {
                      try {
                        const svg = await fetchSvgContent(outline);
                        await Clipboard.copy(svg);
                        await showToast(Toast.Style.Success, "Copied SVG", outline);
                      } catch (error) {
                        await showFailureToast(error, { title: "Failed to Copy SVG" });
                      }
                    }}
                  />
                )}
                {outline && (
                  <Action
                    title="Download Outline SVG"
                    icon={{
                      source: BASE_URL + outline + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={() => downloadSVG(outline)}
                  />
                )}
                {filled && (
                  <Action
                    title="Copy Filled SVG"
                    icon={{
                      source: BASE_URL + filled + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={async () => {
                      try {
                        const svg = await fetchSvgContent(filled);
                        await Clipboard.copy(svg);
                        await showToast(Toast.Style.Success, "Copied SVG", filled);
                      } catch (error) {
                        await showFailureToast(error, { title: "Failed to Copy SVG" });
                      }
                    }}
                    shortcut={{
                      macOS: { modifiers: ["opt"], key: "return" },
                      Windows: { modifiers: ["alt"], key: "return" },
                    }}
                  />
                )}
                {filled && (
                  <Action
                    title="Download Filled SVG"
                    icon={{
                      source: BASE_URL + filled + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={() => downloadSVG(filled)}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "opt"], key: "return" },
                      Windows: { modifiers: ["ctrl", "alt"], key: "return" },
                    }}
                  />
                )}
                {!outline && !filled && sanityIcon.svg && (
                  <Action
                    title="Copy SVG"
                    icon={{
                      source: BASE_URL + sanityIcon.svg + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={async () => {
                      try {
                        const svg = await fetchSvgContent(sanityIcon.svg!);
                        await Clipboard.copy(svg);
                        await showToast(Toast.Style.Success, "Copied SVG", sanityIcon.svg);
                      } catch (error) {
                        await showFailureToast(error, { title: "Failed to Copy SVG" });
                      }
                    }}
                  />
                )}
                {!outline && !filled && sanityIcon.svg && (
                  <Action
                    title="Download SVG"
                    icon={{
                      source: BASE_URL + sanityIcon.svg + ".svg",
                      tintColor: {
                        light: Color.PrimaryText,
                        dark: Color.PrimaryText,
                      },
                    }}
                    onAction={() => downloadSVG(sanityIcon.svg!)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && filteredIcons.length === 0 && (
        <Grid.EmptyView title="No Icons Found" description="Try a different search term" />
      )}
    </Grid>
  );
}
