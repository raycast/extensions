import { Icon, List } from "@raycast/api";
import { ViewPalettesActions } from "./components/palette/ViewPalettesActions";
import { useColorPalettes } from "./hooks/useColorPalettes";
import { usePaletteActions } from "./hooks/usePaletteActions";
import { useSearchPalette } from "./hooks/useSearchPalette";
import { SavedPalette } from "./types";

const createMarkdown = (palette: SavedPalette) => {
  return `
# ${palette.name}

**Description:** ${palette.description || "No description provided"}

**Created:** ${new Date(palette.createdAt).toLocaleDateString()}

**Colors:** ${palette.colors.length} color${palette.colors.length !== 1 ? "s" : ""}
`;
};

export default function Command() {
  const { colorPalettes, setColorPalettes, isLoading } = useColorPalettes();
  const { paletteActions } = usePaletteActions(colorPalettes, setColorPalettes);
  const { setSearchText, filteredPalettes } = useSearchPalette(colorPalettes);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Color Palettes"
      searchBarPlaceholder="Search your Color Palette..."
      isShowingDetail={true}
    >
      {filteredPalettes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Ellipsis}
          title="No Color Palettes Found"
          description="Create your first Color Palette using the Save Color Palette command"
        />
      ) : (
        filteredPalettes.map((palette) => (
          <List.Item
            key={palette.id}
            icon={{
              source: palette.mode === "dark" ? Icon.Moon : Icon.Sun,
              tintColor: palette.mode === "dark" ? "#000000" : "#ffffff",
            }}
            title={palette.name}
            keywords={palette.keywords || []}
            detail={
              <List.Item.Detail
                markdown={createMarkdown(palette)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      icon={palette.mode === "dark" ? Icon.Moon : Icon.Sun}
                      title="Mode"
                      text={palette.mode.charAt(0).toUpperCase() + palette.mode.slice(1) + " Color Palette"}
                    />
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {palette.keywords?.length > 0 &&
                        palette.keywords.map((keyword, idx) => (
                          <List.Item.Detail.Metadata.TagList.Item key={idx} text={keyword} />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {palette.colors.map((color, idx) => (
                      <List.Item.Detail.Metadata.TagList key={idx} title={`Color ${idx + 1}`}>
                        <List.Item.Detail.Metadata.TagList.Item text={color} color={color} />
                      </List.Item.Detail.Metadata.TagList>
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={<ViewPalettesActions palette={palette} paletteActions={paletteActions} />}
          />
        ))
      )}
    </List>
  );
}
