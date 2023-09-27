import { Action, ActionPanel, Grid } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

type Keys = "n" | "s" | "t" | "c" | "u" | "v" | "r";
type Icon = { [key in Keys]: string };

const Raw = "https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/";

export default function Command() {
  const [data, setData] = useState<Icon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetcher = async () => {
    const { data } = await axios.get("https://tabler-icons.io/icons.json");
    if (data) setIsLoading(false);

    setData(data);
  };

  useEffect(() => {
    fetcher();
  }, []);

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Large}>
      {!isLoading &&
        data.map((icon) => (
          <Grid.Item
            key={icon.n}
            title={icon.n}
            content={Raw + icon.n + ".svg"}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy SVG" content={icon.s} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
