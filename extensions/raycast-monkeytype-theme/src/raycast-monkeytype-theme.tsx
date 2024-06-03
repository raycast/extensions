import { Action, ActionPanel, Icon, List, closeMainWindow, LocalStorage, Toast, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

type Theme = {
  authorUsername: string;
  appearance: "light" | "dark";
  name: string;
  colors: {
    background: string;
    backgroundSecondary: string;
    text: string;
    selection: string;
    loader: string;
  };
  "ray.so.url": string;
  "ray.so.add.url": string;
};

export default function RaycastMonkeyTypeTheme() {
  const [isLoading, setIsLoading] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [appearanceFilter, setAppearanceFilter] = useState("all");

  useEffect(() => {
    setIsLoading(true);

    async function fetchThemes() {
      const cacheExpirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const currentTime = new Date().getTime();

      // Attempt to load cached themes and timestamp
      const cachedThemes = await LocalStorage.getItem<string>("themes");
      const cachedTimestamp = await LocalStorage.getItem<string>("themes_timestamp");

      if (cachedThemes && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        if (currentTime - timestamp < cacheExpirationTime) {
          setThemes(JSON.parse(cachedThemes));
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/ridemountainpig/raycast-monkeytype-theme-api/main/raycast-monkeytype-theme.json",
        );
        const themes = await response.json();
        setThemes(themes as Theme[]);

        // Cache the themes and update the timestamp
        await LocalStorage.setItem("themes", JSON.stringify(themes));
        await LocalStorage.setItem("themes_timestamp", currentTime.toString());
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't get the MonkeyType themes.",
          message: "Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchThemes();
  }, []);

  const getImageUrl = (themeName: string) => {
    const formattedName = themeName.replaceAll(" ", "_").toLowerCase();
    const imageUrl = `https://raw.githubusercontent.com/monkeytype-hub/monkeytype-icon/master/monkeytype-icon/png/${formattedName}.png`;
    return imageUrl;
  };

  function getIconColor(value?: string) {
    if (!value) {
      return Icon.CircleFilled;
    }

    return {
      source: Icon.CircleFilled,
      tintColor: { light: value, dark: value, adjustContrast: false },
    };
  }

  function getJsonCofiguration(theme: Theme) {
    const themeJsonString = JSON.stringify(theme, null, 2);
    const themeJson = JSON.parse(themeJsonString);

    delete themeJson["ray.so.url"];
    delete themeJson["ray.so.add.url"];

    themeJson["version"] = "1";
    themeJson["author"] = "Yen Cheng";
    themeJson["authorUsername"] = "ridemountainpig";
    themeJson["colors"]["backgroundSecondary"] = themeJson["colors"]["background"];
    themeJson["colors"]["red"] = "#F50A0A";
    themeJson["colors"]["orange"] = "#F5600A";
    themeJson["colors"]["yellow"] = "#E0A200";
    themeJson["colors"]["green"] = "#07BA65";
    themeJson["colors"]["blue"] = "#0A7FF5";
    themeJson["colors"]["purple"] = "#470AF5";
    themeJson["colors"]["magenta"] = "#F50AA3";

    return JSON.stringify(themeJson, null, 2);
  }

  if (isLoading) {
    return <List isLoading={isLoading} searchBarPlaceholder="Loading themes..." />;
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter by theme name"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Appearance" onChange={setAppearanceFilter}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.BulletPoints} />
          <List.Dropdown.Item title="Light" value="light" icon={Icon.Sun} />
          <List.Dropdown.Item title="Dark" value="dark" icon={Icon.Moon} />
        </List.Dropdown>
      }
    >
      {themes.map((theme) =>
        appearanceFilter != "all" && theme.appearance != appearanceFilter ? null : (
          <List.Item
            key={theme.name}
            title={theme.name}
            keywords={[theme.appearance]}
            icon={{
              source: getImageUrl(theme.name),
            }}
            // accessories={[
            //   { icon: getIconColor(theme.colors.background), tooltip: "Background Color" },
            //   { icon: getIconColor(theme.colors.text), tooltip: "Text Color" },
            //   { icon: getIconColor(theme.colors.selection), tooltip: "Selection Color" },
            //   { icon: getIconColor(theme.colors.loader), tooltip: "Loader Color" },
            // ]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Add to Raycast"
                  icon={Icon.RaycastLogoNeg}
                  target={theme["ray.so.add.url"]}
                  onOpen={() => closeMainWindow()}
                />
                <Action.OpenInBrowser title="Open Theme in Browser" url={theme["ray.so.url"]} />
                <Action.CopyToClipboard
                  title="Copy URL to Share"
                  icon={Icon.Link}
                  content={theme["ray.so.url"]}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />
                <Action.Open
                  title="Install Random Theme"
                  icon={Icon.Stars}
                  target={themes[Math.floor(Math.random() * themes.length)]["ray.so.add.url"]}
                  onOpen={() => closeMainWindow()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy JSON Configuration"
                    content={getJsonCofiguration(theme)}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`![Illustration](https://raw.githubusercontent.com/monkeytype-hub/monkeytype-icon/master/monkeytype-logo/${theme.name.toLowerCase().replaceAll(" ", "_")}.png)`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title={theme.name}
                      icon={{
                        source: getImageUrl(theme.name),
                      }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Theme Appearance"
                      text={theme.appearance == "light" ? "Light" : "Dark"}
                      icon={theme.appearance == "light" ? Icon.Sun : Icon.Moon}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Background Color"
                      text={theme.colors.background}
                      icon={getIconColor(theme.colors.background)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Text Color"
                      icon={getIconColor(theme.colors.text)}
                      text={theme.colors.text}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Selection Color"
                      icon={getIconColor(theme.colors.selection)}
                      text={theme.colors.selection}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Loader Color"
                      icon={getIconColor(theme.colors.loader)}
                      text={theme.colors.loader}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ),
      )}
    </List>
  );
}
