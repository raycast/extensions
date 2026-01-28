import { Grid, Color } from "@raycast/api";
import { IconCategory } from "./types";
import IconActionPanel from "./IconActionPanel";
import { getSvgContent, svgToDataUri } from "./utils";

export default function CategorySection({
  category,
  updateRecentIcons,
}: Readonly<{
  category: IconCategory;
  updateRecentIcons: (category: string, iconName: string) => void;
}>) {
  return (
    <Grid.Section title={category.name} columns={8}>
      {category.icons.map((icon) => {
        const iconName = icon.name;
        const iconCategory = icon.category;

        try {
          const svgContent = getSvgContent(iconCategory, iconName);
          const dataUri = svgToDataUri(svgContent);

          return (
            <Grid.Item
              key={`${iconCategory}-${iconName}`}
              title={iconName}
              content={{
                source: dataUri,
                tooltip: iconName,
                tintColor: Color.PrimaryText,
              }}
              actions={
                <IconActionPanel category={iconCategory} iconName={iconName} updateRecentIcons={updateRecentIcons} />
              }
            />
          );
        } catch (error) {
          console.error(`Error loading icon ${iconCategory}/${iconName}:`, error);
          return null;
        }
      })}
    </Grid.Section>
  );
}
