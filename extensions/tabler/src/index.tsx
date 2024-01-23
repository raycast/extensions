import { Action, ActionPanel, Grid } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

type Icon = { [key in Keys]: string };
type Keys = "name" | "svg" | "tags" | "category" | "url" | "version" | "unicode";

const Raw = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/";

export default function Command() {
  const [data, setData] = useState<Icon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetcher = async () => {
    const { data } = await axios.get("https://tabler.io/api/icons");
    if (data) setIsLoading(false);

    setData(data.icons);
  };

  useEffect(() => {
    fetcher();
  }, []);

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Large}>
      {!isLoading &&
        data.map((icon) => (
          <Grid.Item
            key={icon.name}
            title={icon.name}
            content={Raw + icon.name + ".svg"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy SVG" content={icon.svg} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
