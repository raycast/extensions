import { Action, ActionPanel, Detail, Grid } from "@raycast/api";
import useNewspapers from "./hooks/useNewspapers";

export default function GetNewspapers() {
  const newspapers = useNewspapers();

  return (
    <Grid throttle isLoading={!newspapers} itemSize={Grid.ItemSize.Large} enableFiltering={false}>
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
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Link
                            title={paper.name || ""}
                            target={paper.url || ""}
                            text="Go to website"
                          />
                        </Detail.Metadata>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
