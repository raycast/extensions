import { Cache, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import CategorySection from "./CategorySection";

interface IconCatalog {
  categories: Category[];
}

type Category = {
  name: string;
  icons: RemixIcon[];
};

interface RemixIcon {
  name: string;
  path: string;
  download_url: string;
}

const CACHE_KEY_RECENT_ICONS = "recentIcons";
const cache = new Cache();

function loadRecentIcons() {
  const recent = cache.get(CACHE_KEY_RECENT_ICONS);
  return recent ? JSON.parse(recent) : [];
}

export default function IconsCommand() {
  const [isLoading, setLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<IconCatalog>({ categories: [] });
  const [category, setCategory] = useState<string>("All");
  const [recentIcons, setRecentIcons] =
    useState<RemixIcon[]>(loadRecentIcons());

  let filteredCatalogue: IconCatalog;

  switch (category) {
    case "All":
      filteredCatalogue = {
        categories: [
          {
            name: "Recent",
            icons: recentIcons,
          },
          ...catalogue.categories,
        ],
      };
      break;
    case "Recent":
      filteredCatalogue = {
        categories: [
          {
            name: "Recent",
            icons: recentIcons,
          },
        ],
      };
      break;
    default:
      filteredCatalogue = {
        categories: catalogue.categories.filter((c) => c.name === category),
      };
      break;
  }

  useEffect(() => {
    async function loadCategories() {
      try {
        const categoriesModule = await import("../assets/catalogue.json");
        const catalogue: IconCatalog = categoriesModule.default;
        setCatalogue(catalogue);
        setLoading(false);
      } catch (error) {
        console.error("Error loading catalogue", error);
        showToast(Toast.Style.Failure, "Error loading catalogue");
      }
    }

    loadCategories();
  }, []);

  function updateRecentIcons(icon: RemixIcon) {
    const updatedRecentIcons = [
      icon,
      ...recentIcons.filter((i) => i.name !== icon.name),
    ].slice(0, 8);
    setRecentIcons(updatedRecentIcons);
    cache.set(CACHE_KEY_RECENT_ICONS, JSON.stringify(updatedRecentIcons));
  }

  return (
    <Grid
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Search Remix Icons"
      searchBarPlaceholder="Search all icons..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select variant"
          storeValue={true}
          onChange={(newVariant) => setCategory(newVariant)}
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
