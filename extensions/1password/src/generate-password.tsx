import { getPreferenceValues, PreferenceValues } from "@raycast/api";
import { AuthProvider } from "./v8/components/AuthContext";
import { RandomPassword } from "./v8/components/RandomPassword";

export default function Command() {
  return getPreferenceValues<PreferenceValues>().version == "v8" ? (
    <AuthProvider>
      <RandomPassword />
    </AuthProvider>
  ) : null;
}
