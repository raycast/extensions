import { Action, Detail, getPreferenceValues, openCommandPreferences, useNavigation } from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { fetcher, fetchPromise } from "../utils/fetcher";

const useApi = () => {
  const { apiToken } = getPreferenceValues<NativePreferences>();

  const { push } = useNavigation();

  if (!apiToken) {
    push(
      <Detail
        markdown={"Something wrong with your API Token key. Check your Raycast config and set up a new token."}
        actions={<Action title="Open Preferences" onAction={openCommandPreferences} />}
      />
    );
  }

  return { fetcher, fetchPromise };
};

export default useApi;
