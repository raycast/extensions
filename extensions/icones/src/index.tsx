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
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/id.svg"} title="ID" value={"id"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/url.svg"} title="URL" value={"url"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/html.svg"} title="HTML" value={"html"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/css.svg"} title="CSS" value={"css"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/svg.svg"} title="SVG" value={"svg"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/data_url.svg"} title="Data URL" value={"data_url"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/react.svg"} title="JSX" value={"pure-jsx"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/react.svg"} title="React" value={"jsx"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/react.svg"} title="React TS" value={"tsx"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/vue.svg"} title="Vue" value={"vue"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/svelte.svg"} title="Svelte" value={"svelte"} />
          <Grid.Dropdown.Item icon={"../assets/dropdownIcon/unplugin.svg"} title="Unplugin Icons" value={"unplugin"} />
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
