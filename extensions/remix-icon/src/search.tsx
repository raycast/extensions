import { Cache, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useMemo, useCallback } from "react";
import CategorySection from "./CategorySection";
import { IconCategory, Icon, Catalog, CatalogJSON } from "./types";

const CACHE_KEY_RECENT_ICONS = "recent-icons-cache";
const cache = new Cache();

function loadRecentIcons(): Icon[] {
  const recent = cache.get(CACHE_KEY_RECENT_ICONS);
  if (!recent) return [];

  try {
    const parsed = JSON.parse(recent);
    // Validate that each item has category and name properties
    return parsed.filter(
      (icon: unknown) =>
        icon &&
        typeof icon === "object" &&
        "category" in icon &&
        "name" in icon,
    );
  } catch (e: unknown) {
    console.error("Error parsing recent icons from cache:", e);
    return [];
  }
}

export default function IconsCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<Catalog>({ categories: [] });
  const [category, setCategory] = useState<string>("All");
  const [recentIcons, setRecentIcons] = useState<Icon[]>(loadRecentIcons());

  const filteredCatalogue = useMemo<Catalog>(() => {
    const recentCategory: IconCategory = {
      name: "Recent",
      icons: recentIcons,
    };

    switch (category) {
      case "All":
        return {
          categories: [recentCategory, ...catalogue.categories],
        };
      case "Recent":
        return {
          categories: [recentCategory],
        };
      default:
        return {
          categories: catalogue.categories.filter((c) => c.name === category),
        };
    }
  }, [category, catalogue.categories, recentIcons]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const categoriesModule = await import("../assets/catalogue.json");
        const rawCatalog = categoriesModule.default as CatalogJSON;

        // Convert string[] to Icon[] by including the category name
        const catalogue: Catalog = {
          categories: rawCatalog.categories.map((cat) => ({
            name: cat.name,
            icons: cat.icons.map((name) => ({ name, category: cat.name })),
          })),
        };

        setCatalogue(catalogue);
      } catch (error) {
        console.error("Error loading catalogue", error);
        showToast(Toast.Style.Failure, "Error loading catalogue");
      } finally {
        setIsLoading(false);
      }
    }

    loadCategories();
  }, []);

  const updateRecentIcons = useCallback(
    (category: string, iconName: string) => {
      setRecentIcons((prev) => {
        const updatedRecentIcons = [
          { category, name: iconName },
          ...prev.filter((i) => i.name !== iconName),
        ].slice(0, 8);
        cache.set(CACHE_KEY_RECENT_ICONS, JSON.stringify(updatedRecentIcons));
        return updatedRecentIcons;
      });
    },
    [],
  );

  return (
    <Grid
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Search Remix Icon Library"
      searchBarPlaceholder="Search icons..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select category"
          storeValue={true}
          onChange={(category) => setCategory(category)}
        >
          <Grid.Dropdown.Section title="General">
            <Grid.Dropdown.Item title="All" value="All" key="All" />
            {recentIcons.length > 0 && (
              <Grid.Dropdown.Item title="Recent" value="Recent" key="Recent" />
            )}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Categories">
            {catalogue.categories.map((category) => (
              <Grid.Dropdown.Item
                title={category.name}
                value={category.name}
                key={category.name}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      columns={8}
      inset={Grid.Inset.Large}
    >
      {filteredCatalogue.categories.map((category) => (
        <CategorySection
          key={category.name}
          category={category}
          updateRecentIcons={updateRecentIcons}
        />
      ))}
    </Grid>
  );
}
