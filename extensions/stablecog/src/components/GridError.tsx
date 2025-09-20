import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import {
  getErrorText,
  insufficientCreditsCode,
  notEnoughCreditsString,
  nsfwPromptCode,
  nsfwPromptString,
} from "@ts/errors";

export default function GridError({ error, searchBarAccessory }: { error: string; searchBarAccessory?: JSX.Element }) {
  return (
    <Grid
      searchBarAccessory={searchBarAccessory}
      actions={
        (error === insufficientCreditsCode || error === notEnoughCreditsString) && (
          <ActionPanel>
            <Action.OpenInBrowser title="Subscribe at stablecog.com" url="https://stablecog.com/pricing" />
          </ActionPanel>
        )
      }
    >
      <Grid.EmptyView
        key="error"
        icon={
          error === insufficientCreditsCode || error === notEnoughCreditsString
            ? Icon.Bolt
            : error === nsfwPromptCode || error === nsfwPromptString
              ? Icon.Warning
              : Icon.Bug
        }
        title={getErrorText(error)}
      />
    </Grid>
  );
}
