import { Grid, Color } from "@raycast/api";
import { Category, RemixIcon } from "./types";
import IconActionPanel from "./IconActionPanel";

export default function CategorySection({
  category,
  updateRecentIcons,
}: Readonly<{
  category: Category;
  updateRecentIcons: (icon: RemixIcon) => void;
}>) {
  return (
    <Grid.Section title={category.name} columns={8}>
      {category.icons.map((icon) => (
        <Grid.Item
          key={icon.name}
          title={icon.name}
          content={{
            source: `${icon.path}`,
            tooltip: icon.name,
            tintColor: Color.PrimaryText,
          }}
          actions={
            <IconActionPanel
              icon={icon}
              updateRecentIcons={updateRecentIcons}
            />
          }
        />
      ))}
    </Grid.Section>
  );
}
