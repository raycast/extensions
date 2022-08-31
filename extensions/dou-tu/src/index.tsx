import { useEffect, useState } from "react";
import { Grid } from "@raycast/api";
import clipboardService from "./services/clipboardService";
import sourcesService from "./services/sourcesService";
import { IDoutuImage } from "./services/sources";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<IDoutuImage[]>([]);
  let counter = 0;

  useEffect(() => {
    refreshList("hello", 1, 10);
  }, []);

  const refreshList = async (keyword: string, pageIndex: number, pageSize: number) => {
    setIsLoading(true);
    setList(await sourcesService.get(keyword, pageIndex, pageSize));
    setIsLoading(false);
  };

  return (
    <Grid
      throttle={true}
      selectedItemId={"aaa"}
      isLoading={isLoading}
      onSearchTextChange={(keyword) => {
        refreshList(keyword, 1, 10);
      }}
      onSelectionChange={(id) => {
        if (!id) return;
        if (id == "0" && counter < 2) return counter++;
        const item = list.find((o) => o.id.toString() == id);
        item && clipboardService.imageToClipboard(item.url);
      }}
    >
      {list.map((item, index) => (
        <Grid.Item key={index} id={item.id.toString()} content={{ source: item.url }} />
      ))}
    </Grid>
  );
}
