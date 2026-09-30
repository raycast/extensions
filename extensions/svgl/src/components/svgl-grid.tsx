import { Grid } from "@raycast/api";
import { useState } from "react";
import { useSvglExtension } from "./app-context";
import AllGrid from "./grids/all-grid";
import CategoryGrid from "./grids/category-grid";
import PinnedGrid from "./grids/pinned-grid";
import RecentGrid from "./grids/recent-grid";

export default function SvglGrid() {
  const [selectCategory, setSelectCategory] = useState("All");
  const { isLoading, categories, selectedItemKey } = useSvglExtension();

  return (
    <Grid
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      navigationTitle="Search SVG Logos"
      searchBarPlaceholder="Search SVG Logos"
      selectedItemId={selectedItemKey}
      columns={6}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Logo Category"
          storeValue={true}
          onChange={(newValue) => setSelectCategory(newValue)}
        >
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item key="All" title="All" value="All" />
            <Grid.Dropdown.Item key="Pinned" title="Pinned" value="Pinned" />
            <Grid.Dropdown.Item key="Recently Used" title="Recently Used" value="Recently Used" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Logo Categories">
            {categories.map((category) => (
              <Grid.Dropdown.Item key={category.category} title={category.category} value={category.category} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading && selectCategory === "All" ? (
        <AllGrid />
      ) : selectCategory === "Pinned" ? (
        <PinnedGrid />
      ) : selectCategory === "Recently Used" ? (
        <RecentGrid />
      ) : (
        <CategoryGrid selectCategory={selectCategory} />
      )}
    </Grid>
  );
}
