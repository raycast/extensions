import { read, remove } from "./utils/storage";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { PaletteDetail } from "./components/PaletteDetail";
import { eachHex } from "./utils/util";

export default function Collections() {
  const [data, setData] = useState<
    {
      code: string;
      svg: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    read().then(async (data) => {
      const result: { code: string; svg: string }[] = [];
      for (const item of data) {
        result.push({
          code: item.code,
          svg: item.svg,
        });
      }
      setData(result);
      setIsLoading(false);
    });
  }, []);

  return (
    <Grid
      columns={5}
      aspectRatio={"9/16"}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${(data || []).length} palettes`}
    >
      {(data || []).map(({ code, svg }) => {
        return (
          <Grid.Item
            actions={
              <ActionPanel>
                <Action.Push target={<PaletteDetail id={code} />} title="View Details" icon={Icon.Bird} />
                <Action
                  title="Unfavorite"
                  onAction={() => {
                    remove(code).then(() => {
                      setData(data.filter((item) => item.code !== code));
                    });
                  }}
                  icon={Icon.StarDisabled}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "n",
                  }}
                />
              </ActionPanel>
            }
            key={code}
            keywords={Array.from(eachHex(code))}
            content={svg}
          />
        );
      })}
    </Grid>
  );
}
