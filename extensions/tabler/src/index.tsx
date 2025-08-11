import { Action, ActionPanel, Grid, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Styles = {
  outline?: { version: string; unicode: string; svg: string };
  filled?: { version: string; unicode: string; svg: string };
};

type TablerIcon = {
  name: string;
  svg?: string;
  tags: string[];
  category: string;
  url?: string;
  version?: string;
  unicode?: string;
  styles?: Styles;
};

const Outline = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/outline/";
const Filled = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/filled/";

export default function Command() {
  const { isLoading, data } = useFetch("https://tabler.io/api/icons", {
    mapResult(result: { icons: TablerIcon[] }) {
      return {
        data: result.icons,
      };
    },
    keepPreviousData: false,
    initialData: [],
  });

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Large}>
      {!isLoading &&
        data.map((tablerIcon) => {
          const outline = tablerIcon.styles?.outline?.svg;
          const filled = tablerIcon.styles?.filled?.svg;
          return (
            <Grid.Item
              key={tablerIcon.name}
              title={tablerIcon.name}
              content={Outline + tablerIcon.name + ".svg"}
              accessory={
                filled
                  ? {
                      tooltip: "Filled Version Available",
                      icon: {
                        source: Filled + tablerIcon.name + ".svg",
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
                  {outline && (
                    <Action.CopyToClipboard
                      title="Copy Outline SVG"
                      content={outline}
                      icon={Outline + tablerIcon.name + ".svg"}
                    />
                  )}
                  {filled && (
                    <Action.CopyToClipboard
                      title="Copy Filled SVG"
                      content={filled}
                      icon={Filled + tablerIcon.name + ".svg"}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={tablerIcon.name}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  />
                  {tablerIcon.styles?.outline?.unicode && (
                    <Action.CopyToClipboard
                      title="Copy Outline HTML Char"
                      content={`&#x${tablerIcon.styles.outline.unicode};`}
                    />
                  )}
                  {tablerIcon.styles?.filled?.unicode && (
                    <Action.CopyToClipboard
                      title="Copy Filled HTML Char"
                      content={`&#x${tablerIcon.styles.filled.unicode};`}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
