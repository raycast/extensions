import { ActionPanel, Action, showToast, Toast, Image, Grid } from "@raycast/api";
import { ListOrGrid, ListOrGridSection, ListOrGridItem } from "./list-or-grid";

import { useState, useEffect } from "react";
import fetch from "node-fetch";

export interface Result {
  name?: string;
  svg_path?: string;
  css?: string;
  tsx?: string;
}

type Content = {
  results: Result[];
};

interface ServerContent {
  [identifier: string]: Result[][];
}

export default function iconList() {
  const [state, setState] = useState<Content>({
    results: [],
  });

  useEffect(() => {
    async function fetch() {
      const articles = await fetchIcons();

      setState((oldState) => ({
        ...oldState,
        results: articles,
      }));
    }

    fetch();
  }, []);

  return (
    <ListOrGrid
      isLoading={state.results.length === 0}
      searchBarPlaceholder={"Search CSS.GG icons..."}
      inset={Grid.Inset.Medium}
      columns={8}
    >
      <ListOrGridSection title="CSS.GG" subtitle="704 Pure CSS and SVG icons">
        {state.results.map((result, index) => (
          <IconListItem
            key={index}
            name={`${result.name ?? "<no name>"}`}
            svg_path={`${result.svg_path ?? "<no name>"}`}
            tsx={`${result.tsx ?? "<no name>"}`}
            css={`
              ${result.css ?? "<no name>"}
            `}
          />
        ))}
      </ListOrGridSection>
    </ListOrGrid>
  );
}

function IconListItem(props: { name: string; svg_path: string; tsx: string; css: string }) {
  const { name = "<no name>", svg_path, tsx, css } = props || {};

  const apiPathLight = "https://cssgg.vercel.app/dark/";
  const apiPathDark = "https://cssgg.vercel.app/light/";

  const nameFormatted = name.replace(/-/g, " ").replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase());

  return (
    <ListOrGridItem
      id={name}
      title={nameFormatted}
      icon={{
        source: {
          light: apiPathLight + name + ".png",
          dark: apiPathDark + name + ".png",
        },
      }}
      content={{
        source: {
          light: apiPathLight + name + ".png",
          dark: apiPathDark + name + ".png",
        },
      }}
      accessoryTitle={"css.gg/" + name}
      accessoryIcon={{
        source: {
          light: apiPathLight + "link.png",
          dark: apiPathDark + "link.png",
        },
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy or Open">
            <Action.CopyToClipboard
              title={"Copy to Clipboard"}
              content={svg_path}
              icon={{
                source: {
                  light: apiPathLight + "copy.png",
                  dark: apiPathDark + "copy.png",
                },
              }}
            />
            <Action.OpenInBrowser
              title={"Open in Browser"}
              url={"https://css.gg/" + name}
              icon={{
                source: {
                  light: apiPathLight + "globe-alt.png",
                  dark: apiPathDark + "globe-alt.png",
                },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy as Inline">
            <Action.CopyToClipboard
              title="CSS"
              icon={{
                source: {
                  light: apiPathLight + "menu-left-alt.png",
                  dark: apiPathDark + "menu-left-alt.png",
                },
              }}
              shortcut={{ modifiers: ["opt"], key: "1" }}
              content={css}
            />
            <Action.CopyToClipboard
              title="TSX"
              icon={{
                source: {
                  light: apiPathLight + "style.png",
                  dark: apiPathDark + "style.png",
                },
              }}
              shortcut={{ modifiers: ["opt"], key: "2" }}
              content={tsx}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy Markup">
            <Action.CopyToClipboard
              title="Copy CSS Version Markup"
              icon={{
                source: {
                  light: apiPathLight + "asterisk.png",
                  dark: apiPathDark + "asterisk.png",
                },
              }}
              content={'<i class="gg-' + name + '"></i>'}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy SVG Sprite Markup"
              icon={{
                source: {
                  light: apiPathLight + "path-crop.png",
                  dark: apiPathDark + "path-crop.png",
                },
              }}
              content={'<svg><use xlink:href="/all.svg#gg-' + name + '"/></svg>'}
              shortcut={{ modifiers: ["opt"], key: "s" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Include">
            <Action.CopyToClipboard
              icon={{
                source: {
                  light: apiPathLight + "bowl.png",
                  dark: apiPathDark + "bowl.png",
                },
              }}
              title="Stylesheet"
              content={'<link href="https://css.gg/' + name + '.css" rel="stylesheet">'}
            />
            <Action.CopyToClipboard
              icon={{
                source: {
                  light: apiPathLight + "import.png",
                  dark: apiPathDark + "import.png",
                },
              }}
              title="CSS @import"
              content={'@import url("https://css.gg/' + name + '.css");'}
            />
            <Action.CopyToClipboard
              icon={{
                source: {
                  light: apiPathLight + "code.png",
                  dark: apiPathDark + "code.png",
                },
              }}
              title="JSON"
              content={"https://css.gg/json?=" + name}
            />
            <Action.CopyToClipboard
              icon={{
                source: {
                  light: apiPathLight + "format-separator.png",
                  dark: apiPathDark + "format-separator.png",
                },
              }}
              title="XML"
              content={"https://css.gg/xml?=" + name}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Download">
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "software-download.png",
                  dark: apiPathDark + "software-download.png",
                },
              }}
              title={"Download " + nameFormatted + " as .CSS"}
              url={"https://css.gg/" + name + ".css"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "software-download.png",
                  dark: apiPathDark + "software-download.png",
                },
              }}
              title={"Download " + nameFormatted + " as .SVG"}
              url={"https://css.gg/" + name + ".svg"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "software-download.png",
                  dark: apiPathDark + "software-download.png",
                },
              }}
              title={"Download " + nameFormatted + " as .SCSS"}
              url={"https://unpkg.com/css.gg@2.0.0/icons/scss/" + name + ".scss"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "software-download.png",
                  dark: apiPathDark + "software-download.png",
                },
              }}
              title={"Download " + nameFormatted + " as White .PNG"}
              url={apiPathDark + name + ".png"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "software-download.png",
                  dark: apiPathDark + "software-download.png",
                },
              }}
              title={"Download " + nameFormatted + " as Black .PNG"}
              url={apiPathLight + name + ".png"}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Tools">
            <Action.OpenInBrowser
              title="Open in Figma"
              icon={{
                source: {
                  light: apiPathLight + "figma.png",
                  dark: apiPathDark + "figma.png",
                },
              }}
              url="https://css.gg/fig"
            />
            <Action.OpenInBrowser
              title="Open in Adobe XD"
              icon={{
                source: {
                  light: apiPathLight + "components.png",
                  dark: apiPathDark + "components.png",
                },
              }}
              url="https://css.gg/xd"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Download all 704 icons as Package">
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "box.png",
                  dark: apiPathDark + "box.png",
                },
              }}
              title={"Download as SVG Sprite"}
              url={"https://css.gg/all.svg"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "box.png",
                  dark: apiPathDark + "box.png",
                },
              }}
              title={"Download as .JSON"}
              url={"https://css.gg/all.json"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "box.png",
                  dark: apiPathDark + "box.png",
                },
              }}
              title={"Download as .CSS"}
              url={"https://css.gg/all.css"}
            />
            <Action.OpenInBrowser
              icon={{
                source: {
                  light: apiPathLight + "box.png",
                  dark: apiPathDark + "box.png",
                },
              }}
              title={"Download as .SCSS"}
              url={"https://css.gg/all.scss"}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="NPM">
            <Action.CopyToClipboard
              icon={{
                source: {
                  light: apiPathLight + "npm.png",
                  dark: apiPathDark + "npm.png",
                },
              }}
              title="npm i css.gg"
              content="npm i css.gg"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              title="Documentation"
              icon={{
                source: {
                  light: apiPathLight + "file-document.png",
                  dark: apiPathDark + "file-document.png",
                },
              }}
              url="https://github.com/astrit/css.gg"
            />
            <Action.OpenInBrowser
              title="Donate"
              icon={{
                source: {
                  light: apiPathLight + "heart.png",
                  dark: apiPathDark + "heart.png",
                },
              }}
              url="https://github.com/sponsors/astrit"
            />
            <Action.OpenInBrowser
              title="Repository"
              icon={{
                source: {
                  light: apiPathLight + "code-slash.png",
                  dark: apiPathDark + "code-slash.png",
                },
              }}
              url="https://github.com/astrit/css.gg"
            />
            <Action.OpenInBrowser
              title="Author"
              icon={{ source: "https://github.com/astrit.png", mask: Image.Mask.Circle }}
              url="https://a.st/yt"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function fetchIcons(): Promise<Result[]> {
  try {
    const response = await fetch("https://cssgg.vercel.app/icons.json");
    const json = await response.json();
    const content = json as ServerContent;

    const objects: Result[] = [];

    Object.values(content).forEach((item) => {
      item.forEach((subItem) => {
        subItem.forEach((result) => {
          objects.push(result);
        });
      });
    });

    return objects;
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, "Could not load icons");
    return Promise.resolve([]);
  }
}
