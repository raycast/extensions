import { showError } from "@chrismessina/raycast-kit";
import { Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { getAppFavicon, removeCustomApp, setAppVisibility } from "../helpers/apps";
import { useApps } from "../hooks/useApps";
import { AppEntry } from "../types";
import { AppManagementActionPanels } from "./AppManagementActionPanels";

const byName = (a: AppEntry, b: AppEntry) => a.name.localeCompare(b.name);

export default function ManageAppsCommand() {
  const { entries, isLoading } = useApps();

  const toggleVisible = async (app: AppEntry) => {
    const visible = !app.visible;
    try {
      await setAppVisibility(app.value, visible);
      await showToast({
        style: Toast.Style.Success,
        title: visible ? "App Shown" : "App Hidden",
        message: `${app.name} is now ${visible ? "shown" : "hidden"} in Open Profile`,
      });
    } catch (error) {
      await showError(error, { title: "Couldn't Update App" });
    }
  };

  const deleteCustomApp = async (app: AppEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete Custom App",
      message: `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await removeCustomApp(app.value);
      await showToast({ style: Toast.Style.Success, title: "App Deleted", message: app.name });
    } catch (error) {
      await showError(error, { title: "Couldn't Delete App" });
    }
  };

  const renderApp = (app: AppEntry) => (
    <List.Item
      key={app.value}
      title={app.name}
      subtitle={app.urlTemplate}
      icon={getAppFavicon(app)}
      accessories={[
        {
          icon: {
            source: app.visible ? Icon.CheckCircle : Icon.Circle,
            tintColor: app.visible ? Color.Green : Color.SecondaryText,
          },
          tooltip: app.visible ? "Shown" : "Hidden",
        },
      ]}
      actions={
        <AppManagementActionPanels app={app} onToggleVisible={toggleVisible} onDeleteCustomApp={deleteCustomApp} />
      }
    />
  );

  const customApps = entries.filter((app) => !app.isDefault).sort(byName);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search social apps...">
      <List.Section title="Default Apps">
        {entries
          .filter((app) => app.isDefault)
          .sort(byName)
          .map(renderApp)}
      </List.Section>

      <List.Section title="Custom Apps">
        {customApps.length === 0 ? (
          <List.Item
            title="No Custom Apps"
            subtitle="Add custom social apps to extend the available options"
            icon={Icon.Info}
            actions={<AppManagementActionPanels />}
          />
        ) : (
          customApps.map(renderApp)
        )}
      </List.Section>
    </List>
  );
}
