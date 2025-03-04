import { getPreferenceValues } from "@raycast/api";
import { AuthProvider } from "./v8/components/AuthContext";

import { Items as ItemsV8 } from "./v8/components/Vaults";

export default function Command() {
  return getPreferenceValues<ExtensionPreferences>().version === "v8" ? (
    <AuthProvider>
      <ItemsV8 />
    </AuthProvider>
  ) : null;
}
