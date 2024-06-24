import { getPreferenceValues } from "@raycast/api";
import { RemoteApi } from "./api/api";
import { Remote } from "./remote";

export function defaultRemote() {
    const remoteApi = new RemoteApi(getPreferenceValues().apiKey, getPreferenceValues().isSandbox);
    const remote = new Remote(remoteApi);
    return remote;
}
