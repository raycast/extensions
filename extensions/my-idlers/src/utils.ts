import { getPreferenceValues } from "@raycast/api";
const MAX = 999999;
const { max_num_as_unmetered } = getPreferenceValues<Preferences>();
export function numOrUnmetered(num: number) {
    return (num===MAX && max_num_as_unmetered) ? "Unmetered" : num.toString();
}