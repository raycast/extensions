import type { LaunchProps } from "@raycast/api";
import { RequireGh } from "./components/require-gh";
import { SettingsView } from "./components/settings/settings-view";
import { Organizations } from "./components/settings/organizations";
import { Repositories } from "./components/settings/repositories";
import { Teams } from "./components/settings/teams";
import { IgnoredAuthors } from "./components/settings/ignored-authors";
import { SavedFilters } from "./components/settings/saved-filters";
import { NotificationSettingsView } from "./components/settings/notifications";

export default function Command({ launchContext }: LaunchProps<{ launchContext: { section?: string } }>) {
  const section = launchContext?.section;
  const screens: Record<string, React.ReactNode> = {
    organizations: <Organizations />,
    repositories: <Repositories />,
    teams: <Teams />,
    "ignored-authors": <IgnoredAuthors />,
    "saved-filters": <SavedFilters />,
    notifications: <NotificationSettingsView />,
  };
  return <RequireGh>{(section && screens[section]) || <SettingsView initialSelection={section} />}</RequireGh>;
}
