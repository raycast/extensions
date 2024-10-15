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
  return (
    <Grid columns={5} filtering={false} isLoading={isLoading}>
      <Grid.Section title={name}>
        {Object.values(tailwind_colors).map((color, index) => (
          <Grid.Item
            key={color + index}
            title={color}
            content={{
              value: {
                source: `https://hue-palette.com/api/hue-color-image/${color.replace("#", "")}`,
              },
              tooltip: "",
            }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Hue Color to Clipboard"
                  content={color}
                />
                <Action.CopyToClipboard
                  title="Copy Tailwind Hue to Clipboard"
                  content={
                    `${tailwind_colors_name}:` +
                    JSON.stringify(tailwind_colors, null, 4)
                  }
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
