import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { listLinks } from "./api/list-links";
import { isApplicationInstalled, showMustBeInstalledToast } from "./utils/isApplicationInstalled";
import { openLink } from "./utils/url-scheme";

export default function ListUnread() {
  const {
    data: isInstalled,
    isLoading: isInstalledLoading,
    error: installedError,
  } = usePromise(isApplicationInstalled);

  const { data, isLoading, error } = usePromise(listLinks, [], { execute: isInstalled });

  if (installedError || error) {
    installedError ? showMustBeInstalledToast() : showFailureToast(error);
    return null;
  }

  const links = data?.filter((link) => !link.read);
  return (
    <List isLoading={isLoading || isInstalledLoading}>
      {links?.length === 0 && <List.EmptyView />}
      {links?.map((item) => (
        <List.Item
          key={item.id}
          icon={item.starred ? Icon.Star : Icon.Circle}
          accessories={item.tagNames.map((tn) => ({ tag: tn }))}
          title={item.title}
          subtitle={item.url}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => open(openLink(item.url))} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
