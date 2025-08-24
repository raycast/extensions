import { getPreferenceValues } from "@raycast/api";

import { Items as ItemsV7 } from "./v7/components/Items";
import { AuthProvider } from "./v8/components/AuthContext";
import { Items as ItemsV8 } from "./v8/components/Items";

export default function Command() {
  return getPreferenceValues<ExtensionPreferences>().version == "v8" ? (
    <AuthProvider>
      <ItemsV8 />
    </AuthProvider>
  ) : (
    <ItemsV7 />
  );
}
