import { getPreferenceValues } from "@raycast/api";
import Jotform from "jotform";

const { api_key } = getPreferenceValues<Preferences>();
export const jotform = new Jotform(api_key);

// export type Form = {
//     id: string;
//     title: string;
// }