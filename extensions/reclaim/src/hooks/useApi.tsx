import { Detail, getPreferenceValues, useNavigation } from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { fetcher } from "../utils/axiosPromise";

const useApi = () => {
  const { apiToken } = getPreferenceValues<NativePreferences>();

  const { push } = useNavigation();

  if (!apiToken) {
    push(
      <Detail markdown={"Something wrong with your API Token key. Check your raycast config and set up a new token."} />
    );
  }

  return { fetcher };
};

export default useApi;
