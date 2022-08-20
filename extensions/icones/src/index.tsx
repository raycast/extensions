import { getIconSnippet } from "./utils";

import got from "got";
import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  showHUD,
  closeMainWindow,
} from "@raycast/api";

export default function Command() {
  const [copySelect, setCopySelect] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [icons, setIcons] = useState<Iconify.Icons>([]);

  const API_ENTRY = "https://api.iconify.design";

  async function search(query = "apple") {
    query = query || "apple";
    setIsLoading(true);
    const searchAPI = `${API_ENTRY}/search?query=${query}&limit=96`;

    return await got(searchAPI)
      .json<Iconify.IconifyResponse>()
      .then((res) => {
        setIsLoading(false);

        return res.icons;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Iconify Error", err.message);

        return [];
      });
  }

  useEffect(() => {
    (async () => setIcons(await search()))();
  }, []);

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setIcons(await search(query))}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Choose Copy Type"
          storeValue
          onChange={(newValue) => {
            setCopySelect(newValue as string);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/id.svg", tintColor: Color.PrimaryText }}
            title="ID"
            value={"id"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/url.svg", tintColor: Color.PrimaryText }}
            title="URL"
            value={"url"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/html.svg", tintColor: Color.PrimaryText }}
            title="HTML"
            value={"html"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/css.svg", tintColor: Color.PrimaryText }}
            title="CSS"
            value={"css"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/svg.svg", tintColor: Color.PrimaryText }}
            title="SVG"
            value={"svg"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/data_url.svg", tintColor: Color.PrimaryText }}
            title="Data URL"
            value={"data_url"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/react.svg", tintColor: Color.PrimaryText }}
            title="JSX"
            value={"pure-jsx"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/react.svg", tintColor: Color.PrimaryText }}
            title="React"
            value={"jsx"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/react.svg", tintColor: Color.PrimaryText }}
            title="React TS"
            value={"tsx"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/vue.svg", tintColor: Color.PrimaryText }}
            title="Vue"
            value={"vue"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/svelte.svg", tintColor: Color.PrimaryText }}
            title="Svelte"
            value={"svelte"}
          />
          <Grid.Dropdown.Item
            icon={{ source: "../assets/dropdownIcon/unplugin.svg", tintColor: Color.PrimaryText }}
            title="Unplugin Icons"
            value={"unplugin"}
          />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        icons.map((icon) => (
          <Grid.Item
            key={icon}
            content={{
              value: { source: `https://api.iconify.design/${icon}.svg`, tintColor: Color.PrimaryText },
              tooltip: icon.split(":")[1],
            }}
            title={icon.split(":")[1]}
            subtitle={icon.split(":")[0]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    try {
                      const snippte = (await getIconSnippet(icon, copySelect)) ?? "";
                      await Clipboard.copy(snippte);
                      await showHUD("Copied to Clipboard 🎉");
                    } catch (err) {
                      await showHUD("Error copying to clipboard 😞");
                    }
                  }}
                />
                <Action
                  title="Paste to Cursor"
                  icon={Icon.TextCursor}
                  onAction={async () => {
                    try {
                      const snippte = (await getIconSnippet(icon, copySelect)) ?? "";
                      await Clipboard.paste(snippte);
                      await closeMainWindow();
                    } catch (error) {
                      await showHUD("Error pasting to cursor 😞");
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
