import { Grid } from "@raycast/api";
import { loadingGif } from "@ts/constants";

export default function GridLoading({ columns, itemCount }: { columns: number; itemCount: number }) {
  return (
    <Grid isLoading={true} columns={columns} onSearchTextChange={() => null}>
      {Array.from({ length: itemCount }, (_, i) => (
        <Grid.Item
          key={i}
          content={{
            source: loadingGif,
          }}
        ></Grid.Item>
      ))}
    </Grid>
  );
}
