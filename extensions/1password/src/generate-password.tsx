import { getPreferenceValues } from "@raycast/api";
import { AuthProvider } from "./v8/components/AuthContext";
import { RandomPassword } from "./v8/components/RandomPassword";

export default function Command() {
  return getPreferenceValues<ExtensionPreferences>().version == "v8" ? (
    <AuthProvider>
      <RandomPassword />
    </AuthProvider>
  ) : null;
}
