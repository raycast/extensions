import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import useNewspapers from "./hooks/useNewspapers";

export default function GetNewspapers() {
  const newspapers = useNewspapers();

  return (
    <Grid isLoading={!newspapers} columns={3} filtering={false}>
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
                  icon={Icon.SoccerBall}
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
