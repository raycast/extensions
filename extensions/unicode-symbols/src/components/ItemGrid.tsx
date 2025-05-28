import { memo, useMemo } from "react";

import { Grid } from "@raycast/api";

import DataSetSelector from "@/components/DataSetSelector";
import { GridItem } from "@/components/GridItem";
import { useListContext } from "@/context/ListContext";
import { gridColumnNumber } from "@/lib/preferences";

export const ItemGrid = memo(() => {
  const columnNumber = useMemo(() => gridColumnNumber(), []);
  const { list, onSearchTextChange, loading } = useListContext();
  return (
    <Grid
      isLoading={loading}
      onSearchTextChange={onSearchTextChange}
      filtering={false}
      searchBarAccessory={<DataSetSelector />}
      columns={columnNumber}
    >
      {list.map((section) => (
        <Grid.Section
          key={`${section.sectionTitle}-${section.items.length}`}
          title={section.sectionTitle}
          aspectRatio={"1"}
          fit={Grid.Fit.Fill}
        >
          {section.items.map((item) => {
            const accessories = [];
            if (item.a?.length) {
              accessories.push({ icon: "⌨️", text: `${item.a.join(", ")}` });
            }
            return <GridItem item={item} key={`${section.sectionTitle}-${item.c}-${item.n}`} />;
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
});
