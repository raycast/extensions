import { Action, ActionPanel, Icon, List, closeMainWindow, environment } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import { CONTRIBUTE_URL } from "./helpers";

const baseUrl = "https://ray.so/themes";

type Theme = {
  authorUsername: string;
  version: number;
  author: string;
  appearance: "light" | "dark";
  name: string;
  slug: string;
  colors: {
    background: string;
    backgroundSecondary: string;
    text: string;
    selection: string;
    loader: string;
    red: string;
    orange: string;
    yellow: string;
    green: string;
    blue: string;
    purple: string;
    magenta: string;
  };
  og_image: string;
};

export default function ExploreThemes() {
  const { data: themes, isLoading } = useFetch<Theme[]>(`https:/ray.so/api/themes`);

  const [appearanceFilter, setAppearanceFilter] = useState("all");

  const authors = useMemo(() => {
    if (!themes) return [];

    const authorMap = new Map();
    themes.forEach(({ author, authorUsername }) => {
      const mapKey = `${author}_${authorUsername}`;
      if (!authorMap.has(mapKey)) {
        authorMap.set(mapKey, { name: author, username: authorUsername });
      }
    });

    return Array.from(authorMap.values());
  }, [themes]);

  const filteredThemes = useMemo(() => {
    if (!themes) {
      return [];
    }

    const userRegex = /^user\/(.+)/;
    const userMatch = appearanceFilter.match(userRegex);

    if (userMatch) {
      const username = userMatch[1];
      return themes.filter((theme) => theme.authorUsername === username);
    }

    if (appearanceFilter === "all") {
      return themes;
    }

    return themes.filter((theme) => theme.appearance === appearanceFilter);
  }, [appearanceFilter, themes]);

  function getThemeURL(theme: Theme): string {
    const { raycastVersion } = environment;
    const protocol = raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

    const encode = (value: string) => encodeURIComponent(value);
    const urlWithoutColors = `${protocol}theme?version=${theme.version}&name=${encode(theme.name)}&appearance=${encode(
      theme.appearance,
    )}`;

    const colors = [
      theme.colors.background,
      theme.colors.backgroundSecondary,
      theme.colors.text,
      theme.colors.selection,
      theme.colors.loader,
      theme.colors.red,
      theme.colors.orange,
      theme.colors.yellow,
      theme.colors.green,
      theme.colors.blue,
      theme.colors.purple,
      theme.colors.magenta,
    ];

    return `${urlWithoutColors}&colors=${colors.map(encode).join(",")}`;
  }

  function getMarkdownImage(theme: Theme): string {
    return `![Screenshot of "${theme.name}" theme](${theme.og_image}?raycast-height=200)`;
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter by theme name or appearance"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Appearance" onChange={setAppearanceFilter}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.BulletPoints} />
          <List.Dropdown.Item title="Light" value="light" icon={Icon.Sun} />
          <List.Dropdown.Item title="Dark" value="dark" icon={Icon.Moon} />

          {authors.length > 0 ? (
            <List.Dropdown.Section>
              {authors.map(({ username, name }) => (
                <List.Dropdown.Item
                  key={`author_${username}_${name}`}
                  title={name}
                  value={`user/${username}`}
                  icon={getAvatarIcon(name)}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
      isLoading={isLoading}
    >
      {filteredThemes.map((theme) => {
        const backgroundType = theme.colors.background === theme.colors.backgroundSecondary ? "solid" : "gradient";

        return (
          <List.Item
            key={theme.slug}
            title={theme.name}
            keywords={[theme.appearance]}
            icon={{
              value: theme.appearance === "dark" ? Icon.Moon : Icon.Sun,
              tooltip: theme.appearance === "dark" ? "Dark Theme" : "Light Theme",
            }}
            accessories={[
              backgroundType === "gradient"
                ? {
                    icon: getIconGradient(theme.colors.background, theme.colors.backgroundSecondary),
                    tooltip: "Background Color",
                  }
                : { icon: getIconColor(theme.colors.background), tooltip: "Background Color" },
              { icon: getIconColor(theme.colors.text), tooltip: "Text Color" },
              { icon: getIconColor(theme.colors.selection), tooltip: "Selection Color" },
            ]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Add to Raycast"
                  icon={Icon.RaycastLogoNeg}
                  target={getThemeURL(theme)}
                  onOpen={() => closeMainWindow()}
                />
                <Action.OpenInBrowser title="Open Theme in Browser" url={`${baseUrl}/${theme.slug}`} />

                <Action.CopyToClipboard
                  title="Copy URL to Share"
                  icon={Icon.Link}
                  content={getThemeURL(theme)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />

                <Action.Open
                  title="Install Random Theme"
                  icon={Icon.Stars}
                  target={getThemeURL(filteredThemes[Math.floor(Math.random() * filteredThemes.length)])}
                  onOpen={() => closeMainWindow()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />

                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Contribute"
                    icon={Icon.PlusSquare}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    url={CONTRIBUTE_URL}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    /* eslint-disable-next-line @raycast/prefer-title-case */
                    title="Copy JSON Configuration"
                    content={JSON.stringify(theme, null, 2)}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={getMarkdownImage(theme)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Theme Appearance"
                      text={theme.appearance === "dark" ? "Dark" : "Light"}
                      icon={theme.appearance === "dark" ? Icon.Moon : Icon.Sun}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={theme.author}
                      icon={getAvatarIcon(theme.author)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Background Type"
                      text={backgroundType === "solid" ? "Solid" : "Gradient"}
                    />
                    {backgroundType === "solid" ? (
                      <List.Item.Detail.Metadata.Label
                        title="Background Color"
                        text={theme.colors.background}
                        icon={getIconColor(theme.colors.background)}
                      />
                    ) : (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Start Color"
                          text={theme.colors.background}
                          icon={getIconColor(theme.colors.background)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="End Color"
                          text={theme.colors.backgroundSecondary}
                          icon={getIconColor(theme.colors.backgroundSecondary)}
                        />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Text"
                      icon={getIconColor(theme.colors.text)}
                      text={theme.colors.text}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Selection"
                      icon={getIconColor(theme.colors.selection)}
                      text={theme.colors.selection}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Loader"
                      icon={getIconColor(theme.colors.loader)}
                      text={theme.colors.loader}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Red"
                      icon={getIconColor(theme.colors.red)}
                      text={theme.colors.red}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Orange"
                      icon={getIconColor(theme.colors.orange)}
                      text={theme.colors.orange}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Yellow"
                      icon={getIconColor(theme.colors.yellow)}
                      text={theme.colors.yellow}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Green"
                      icon={getIconColor(theme.colors.green)}
                      text={theme.colors.green}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Blue"
                      icon={getIconColor(theme.colors.blue)}
                      text={theme.colors.blue}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Purple"
                      icon={getIconColor(theme.colors.purple)}
                      text={theme.colors.purple}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Magenta"
                      icon={getIconColor(theme.colors.magenta)}
                      text={theme.colors.magenta}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}

function getIconColor(value?: string) {
  if (!value) {
    return Icon.CircleFilled;
  }

  return {
    source: Icon.CircleFilled,
    tintColor: { light: value, dark: value, adjustContrast: false },
  };
}

function getIconGradient(startColor: string, endColor: string) {
  const svg = `<svg width="24px" height="24px">
    <defs>
      <linearGradient id="Gradient" x1="0" x2="0.5" y1="0" y2="1">
        <stop offset="0%" stop-color="${startColor}"/>
        <stop offset="100%" stop-color="${endColor}"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#Gradient)" />
  </svg>`.replaceAll("\n", "");
  return `data:image/svg+xml,${svg}`;
}
