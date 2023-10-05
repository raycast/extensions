import { getPreferenceValues } from "@raycast/api";

import { Items } from "./v7/components/Items";
import { AccountForm } from "./v8/components/AccountForm";

export default function Command() {
  return getPreferenceValues<Preferences>().version == "v8" ? <AccountForm /> : <Items />;
}
