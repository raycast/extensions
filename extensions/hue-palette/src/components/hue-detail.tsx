import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

interface HueDetailProps {
  isLoading?: boolean | false;
  isGenerator?: boolean | false;
  name: string;
  tailwind_colors_name: string;
  tailwind_colors: Record<string, string>;
}

export default function HueDetail({
  isLoading,
  isGenerator,
  name,
  tailwind_colors_name,
  tailwind_colors,
}: HueDetailProps) {
  function convertToV4(colors = {}) {
    let cssVariables = "@theme {\n";
    for (const [colorLevel, hex] of Object.entries(colors)) {
      cssVariables += ` --color-${tailwind_colors_name}-${colorLevel}: ${hex};\n`;
    }
    cssVariables += "}";
    return cssVariables;
  }
  const tailwindColorsV3 = tailwind_colors;
  const tailwindColorsV4 = convertToV4(tailwindColorsV3);

  return (
    <Grid columns={5} filtering={false} isLoading={isLoading}>
      <Grid.Section title={name}>
        {Object.values(tailwind_colors).map((color, index) => (
          <Grid.Item
            key={color + index}
            title={color}
            content={{
              value: {
                source: `https://hue-palette.zeabur.app/hue-color-image/${color.replace("#", "")}`,
              },
              tooltip: "",
            }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Hue Color"
                  content={color}
                />
                <Action.CopyToClipboard
                  title="Copy Hue Tailwind V4 Config Code"
                  content={tailwindColorsV4}
                />
                <Action.CopyToClipboard
                  title="Copy Hue Tailwind V3 Config Code"
                  content={
                    `${tailwind_colors_name}:` +
                    JSON.stringify(tailwindColorsV3, null, 2)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                {isGenerator ? (
                  <Action.OpenInBrowser
                    title="Open Hue in Browser"
                    url={`https://www.hue-palette.com/hue/${name}/${tailwind_colors["50"].replaceAll("#", "")}-${tailwind_colors["900"].replaceAll("#", "")}`}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    icon={Icon.AppWindow}
                  />
                ) : (
                  <Action.OpenInBrowser
                    title="Open Hue in Browser"
                    url={`https://www.hue-palette.com/${name}`}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    icon={Icon.AppWindow}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
