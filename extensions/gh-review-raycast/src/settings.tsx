import { RequireGh } from "./components/require-gh";
import { SettingsView } from "./components/settings/settings-view";

export default function Command() {
  // Configuring orgs, repos, and teams needs a working CLI just as much as the
  // list views do — every picker is populated from GitHub.
  return (
    <RequireGh>
      <SettingsView />
    </RequireGh>
  );
}
