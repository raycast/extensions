import { Icon, LaunchType, MenuBarExtra, launchCommand, open, openExtensionPreferences } from "@raycast/api";
import { useCallback } from "react";

import { dashHomeUrl } from "./utils/dash-urls";

export default function UserplaneMenuBar() {
  const openDashboard = useCallback(() => {
    void open(dashHomeUrl());
  }, []);
  const launchCreate = useCallback(() => {
    void launchCommand({ name: "create-link", type: LaunchType.UserInitiated });
  }, []);
  const launchBrowseRecordings = useCallback(() => {
    void launchCommand({ name: "list-recordings", type: LaunchType.UserInitiated });
  }, []);
  const launchBrowseLinks = useCallback(() => {
    void launchCommand({ name: "list-links", type: LaunchType.UserInitiated });
  }, []);
  const openPrefs = useCallback(() => {
    void openExtensionPreferences();
  }, []);
  const contactSupport = useCallback(() => {
    void open("mailto:support@userplane.io");
  }, []);

  return (
    <MenuBarExtra icon={{ source: "icon.png" }} tooltip="Userplane">
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title="Create Recording Link" icon={Icon.Link} onAction={launchCreate} />
        <MenuBarExtra.Item title="Browse Recordings" icon={Icon.AppWindowGrid3x3} onAction={launchBrowseRecordings} />
        <MenuBarExtra.Item title="Browse Recording Links" icon={Icon.List} onAction={launchBrowseLinks} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Dashboard" icon={Icon.Globe} onAction={openDashboard} />
        <MenuBarExtra.Item title="Contact Support" icon={Icon.Envelope} onAction={contactSupport} />
        <MenuBarExtra.Item title="Extension Preferences" icon={Icon.Gear} onAction={openPrefs} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
