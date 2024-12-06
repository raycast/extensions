import { getPreferenceValues } from "@raycast/api";
const MAX = 999999;
const { max_num_as_unlimited } = getPreferenceValues<Preferences>();
export function numOrUnmetered(num: number) {
    return (num===MAX && max_num_as_unlimited) ? "Unlimited" : num.toString();
}