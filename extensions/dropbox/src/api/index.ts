import { Dropbox } from "dropbox";
import { getPreferenceValues } from "@raycast/api";

const preferenceValues = getPreferenceValues() as { token: string };
export const dropboxCli = new Dropbox({ accessToken: preferenceValues.token });

// dropboxCli.filesSaveUrl()
