import { MenuBarExtra, open, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAppLinks } from "./api";

export default function Command() {
  const { isLoading, data: apps, error, revalidate } = usePromise(getAppLinks);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load apps",
      message: error.message,
    });
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon="icon.svg" tooltip="Okta Apps">
      {apps?.map((app) => (
        <MenuBarExtra.Item
          key={app.id}
          icon={app.logoUrl || Icon.AppWindow}
          title={app.label}
          onAction={() => open(app.linkUrl)}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
