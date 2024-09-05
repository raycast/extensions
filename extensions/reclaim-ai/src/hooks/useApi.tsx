import { Action, Detail, getPreferenceValues, openCommandPreferences, showToast, Toast, useNavigation } from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { fetcher, fetchPromise } from "../utils/fetcher";
import { useFetch } from "@raycast/utils";


const useApi = () => {
  const { apiToken } = getPreferenceValues<NativePreferences>();

  // const { push } = useNavigation();

  if (!apiToken) {
    // push(
    //   <Detail
    //     markdown={"Something is wrong with your API Token key. Check your Raycast config and set up a new token."}
    //     actions={<Action title="Open Preferences" onAction={openCommandPreferences} />}
    //   />
    // );
    showToast({ style: Toast.Style.Failure, title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.", message: "Something wrong with your API Token key. Check your Raycast config and set up a new token." });
  }

  return { fetcher, fetchPromise, useFetchRai: useFetch };
};

export default useApi;
