import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, showToast, Toast } from "@raycast/api";
import { NipponColorAgent } from "./nipponColorAgent";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [colors, setColors] = useState<{ [name: string]: string }>({});

  useEffect(() => {
    async function init() {
      try {
        await NipponColorAgent.buildNipponColorAgent(function (name: string, colorCode: string) {
          setColors((prevColor) => ({ ...prevColor, [name]: colorCode }));
        });
        setIsLoading(false);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: "failed to load colors",
        });
      }
    }
    init();
  }, []);
  return (
    <Grid isLoading={isLoading} searchBarPlaceholder={isLoading ? "Loading..." : "Search colors"}>
      <Grid.EmptyView title="No colors found" description="please create an issue If this screen keeps showing up." />
      {Object.entries(colors).map(([name, colroCode]) => (
        <Grid.Item
          key={name}
          content={{ color: { light: colroCode, dark: colroCode, adjustContrast: false } }}
          title={name}
          subtitle={colroCode}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Nippon Colors" url={`https://nipponcolors.com#${name}`} />
              <Action.CopyToClipboard content={colroCode} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
