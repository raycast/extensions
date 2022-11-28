import moment from "moment";
import { Clipboard, getPreferenceValues } from "@raycast/api";

interface Preferences {
  format: string;
}

const Command = async () => {
  const preferences = getPreferenceValues<Preferences>();
  const date = moment().format(preferences.format);
  await Clipboard.copy(date);
};
export default Command;
