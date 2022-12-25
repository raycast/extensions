import { useState } from "react";
import { ActionPanel, Action, Grid, Icon, Color, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { categories, loadCategory, getPath, getSVG } from "./utils";
import { Category, Preferences } from "./types";

const { action }: Preferences = getPreferenceValues();

export default function Command() {
  const [category, setCategory] = useState<Category>();
  const [isLoading, setIsLoading] = useState(true);

  const onAction = async (content: string, message?: string) => {
    if (action === "Copy") {
      await Clipboard.copy(content);
      await showHUD(`Copied ${message ? message : content}`);
    } else {
      await Clipboard.paste(content);
    }
  };

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="React Icons Category"
          storeValue
          onChange={(value) => {
            setIsLoading(true);
            setCategory(loadCategory(value));
            setIsLoading(false);
          }}
        >
          {categories.map((category: string) => (
            <Grid.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        category?.icons.map((icon: string, index: number) => {
          const path = getPath(category.title, icon);
          return (
            <Grid.Item
              key={index}
              content={{ value: { source: path, tintColor: Color.PrimaryText }, tooltip: icon }}
              title={icon}
              actions={
                <ActionPanel>
                  <Action
                    title={action === "Copy" ? "Copy Name to Clipboard" : "Paste Name"}
                    icon={Icon.Clipboard}
                    onAction={async () => onAction(icon)}
                  />
                  <Action
                    title={action === "Copy" ? "Copy React Component to Clipboard" : "Paste React Component"}
                    icon={Icon.Code}
                    onAction={async () => onAction(`<${icon} />`)}
                  />
                  <Action
                    title={action === "Copy" ? "Copy Import Statement to Clipboard" : "Paste Import Statement"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    icon={Icon.Code}
                    onAction={async () => onAction(`import { ${icon} } from "${category.id}";`)}
                  />
                  <Action
                    title={action === "Copy" ? "Copy SVG to Clipboard" : "Paste SVG"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: action === "Copy" ? "c" : "v" }}
                    icon={Icon.CodeBlock}
                    onAction={async () => onAction(getSVG(path), "SVG")}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
