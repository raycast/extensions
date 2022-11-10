import { Action, ActionPanel, Detail, Grid } from "@raycast/api";
import useNewspapers from "./hooks/useNewspapers";

export default function GetNewspapers() {
  const newspapers = useNewspapers();

  return (
    <Grid isLoading={!newspapers} itemSize={Grid.ItemSize.Large} enableFiltering={false}>
      {newspapers?.map((paper) => {
        return (
          <Grid.Item
            key={paper.title}
            content={{
              tooltip: `${paper.title}`,
              value: `${paper.cover}`,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open"
                  target={
                    <Detail
                      markdown={`![](${paper.cover})`}
                      navigationTitle={paper.title}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser url={paper.url || ""} />
                        </ActionPanel>
                      }
                    />
                  }
                />
                <Action.OpenInBrowser url={paper.url || ""} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
