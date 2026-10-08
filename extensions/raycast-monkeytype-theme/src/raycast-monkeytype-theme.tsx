import {
  Alert,
  AI,
  Action,
  ActionPanel,
  confirmAlert,
  closeMainWindow,
  environment,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
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
  "ray.so.light.url": string;
  "ray.so.add.light.url": string;
  "ray.so.dark.url": string;
  "ray.so.add.dark.url": string;
};

export default function RaycastMonkeyTypeTheme() {
  const [isLoading, setIsLoading] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);

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

  function getRandomThemeUrl() {
    return themes[Math.floor(Math.random() * themes.length)][
      Math.floor(Math.random() * 2) == 0 ? "ray.so.add.light.url" : "ray.so.add.dark.url"
    ];
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

  async function validateIdentity(themeName: string) {
    if (!environment.canAccess(AI)) {
      const options: Alert.Options = {
        icon: { source: getImageUrl(themeName) },
        title: "Install " + themeName + " Theme",
        message: "Custom Themes require an active Pro subscription",
        primaryAction: {
          title: "Upgrade to Pro",
          onAction: () => {
            open("https://www.raycast.com/pro");
          },
        },
      };
      await confirmAlert(options);
      return false;
    }
    return true;
  }

  const renderThemeActions = (theme: Theme) => {
    const addLightAction = (
      <Action
        title="Add Light Appearance to Raycast"
        icon={Icon.Sun}
        onAction={async () => {
          if (!(await validateIdentity(theme.name))) return;
          open(theme["ray.so.add.light.url"]);
          closeMainWindow();
        }}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
    );

    const addDarkAction = (
      <Action
        title="Add Dark Appearance to Raycast"
        icon={Icon.Moon}
        onAction={async () => {
          if (!(await validateIdentity(theme.name))) return;
          open(theme["ray.so.add.dark.url"]);
          closeMainWindow();
        }}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
    );

    const browserLightAction = (
      <Action.OpenInBrowser
        title="Open Light Appearance in Browser"
        icon={Icon.AppWindow}
        url={theme["ray.so.light.url"]}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      />
    );

    const browserDarkAction = (
      <Action.OpenInBrowser
        title="Open Dark Appearance in Browser"
        icon={Icon.AppWindow}
        url={theme["ray.so.dark.url"]}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      />
    );

    const copyLightAction = (
      <Action.CopyToClipboard
        title="Copy Light Theme URL to Share"
        icon={Icon.Link}
        content={theme["ray.so.light.url"]}
      />
    );

    const copyDarkAction = (
      <Action.CopyToClipboard
        title="Copy Dark Theme URL to Share"
        icon={Icon.Link}
        content={theme["ray.so.dark.url"]}
      />
    );

    return theme.appearance == "light" ? (
      <>
        {addLightAction}
        {addDarkAction}
        {browserLightAction}
        {browserDarkAction}
        {copyLightAction}
        {copyDarkAction}
      </>
    ) : (
      <>
        {addDarkAction}
        {addLightAction}
        {browserDarkAction}
        {browserLightAction}
        {copyDarkAction}
        {copyLightAction}
      </>
    );
  };

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Filter by theme name"
      // searchBarAccessory={
      //   <List.Dropdown tooltip="Filter by Appearance" onChange={setAppearanceFilter}>
      //     <List.Dropdown.Item title="All" value="all" icon={Icon.BulletPoints} />
      //     <List.Dropdown.Item title="Light" value="light" icon={Icon.Sun} />
      //     <List.Dropdown.Item title="Dark" value="dark" icon={Icon.Moon} />
      //   </List.Dropdown>
      // }
    >
      {themes.map((theme) => (
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
              {renderThemeActions(theme)}
              <Action
                title="Install Random Theme"
                icon={Icon.Stars}
                onAction={() => {
                  open(getRandomThemeUrl());
                  closeMainWindow();
                }}
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
                    icon={getIconColor(theme.colors.background)}
                    text={theme.colors.background.toUpperCase()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Text Color"
                    icon={getIconColor(theme.colors.text)}
                    text={theme.colors.text.toUpperCase()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Selection Color"
                    icon={getIconColor(theme.colors.selection)}
                    text={theme.colors.selection.toUpperCase()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Loader Color"
                    icon={getIconColor(theme.colors.loader)}
                    text={theme.colors.loader.toUpperCase()}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
