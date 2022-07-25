import { Action, ActionPanel, Grid } from "@raycast/api";

export const EmptyView = (): JSX.Element => {
  return <Grid.EmptyView title="No Pinned or Recent Icons" icon={{ source: "../assets/Icons8-Cloud.svg" }} />;
};

export const InvalidAPIKey = (): JSX.Element => {
  return (
    <Grid>
      <Grid.EmptyView
        title="Invalid API Key"
        description="Get Valid Api Key From Icons8 Developers."
        icon={{ source: "../assets/API.svg" }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Get API Key"
              url="https://developers.icons8.com"
              icon={{ source: "../assets/Rest API.svg" }}
            />
          </ActionPanel>
        }
      />
    </Grid>
  );
};
