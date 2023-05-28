import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import Preferences from "./types/Preferences";
import ErrorMessage from "./components/ErrorMessage";
import { result, statusLine } from "./helpers/common";
import { isNaN, toNumber } from "lodash";
import { useEffect, useState } from "react";
import Style = Toast.Style;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { togglApiKey } = preferences;
  const hourRate = toNumber(preferences.hourRate);
  const targetHours = toNumber(preferences.targetHours);

  let errorMessage = null;

  if (togglApiKey?.length !== 32) {
    errorMessage = `
## Toggl api key is invalid  
  
##### Please update it in extension's preferences by pressing  \`Enter ↩︎\`
To obtain the Toggl user token: Left sidebar -> Profile -> [Profile settings](https://track.toggl.com/profile) -> Api Token  
`;
  }

  if (isNaN(hourRate) || isNaN(targetHours)) {
    errorMessage = `
## Hour rate and target hours must be a number
  
##### Please update it in extension's preferences by pressing  \`Enter ↩︎\`
`;
  }

  if (hourRate && hourRate < 4.3) {
    errorMessage = `
## Hour rate must be above 4.3 eur/hour
  
##### Please update it in extension's preferences by pressing  \`Enter ↩︎\`  
By Estonian laws the hour rate cannot be less than 4.3 €/hour and 725 €/month. No one in Singleton is getting less than 4.3 €/hour

*We respect the law. Freedom. Democracy. Elagu Eesti 🇪🇪*
`;
  }

  if (errorMessage) {
    return <ErrorMessage message={errorMessage} />;
  }

  interface State {
    markdown: string | undefined;
    isLoading?: boolean;
  }

  const [state, setState] = useState<State>();

  const fetchData = async () => {
    try {
      setState({ markdown: state?.markdown, isLoading: true });
      await showToast({ title: "Making a request...", style: Style.Animated });
      const markdown = await result(hourRate, targetHours);
      setState({ markdown, isLoading: false });
      await showToast({ title: "Loaded successfully", style: Style.Success });
    } catch (error) {
      setState({
        markdown: `ERROR ${error}`,
        isLoading: false,
      });
      await showToast({ title: "Something went wrong", style: Style.Failure });
      console.log("Error", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Detail
      isLoading={state?.isLoading}
      markdown={state?.markdown}
      metadata={statusLine()}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Refresh"
            onSubmit={async () => await fetchData()}
          />
        </ActionPanel>
      }
    />
  );
}
