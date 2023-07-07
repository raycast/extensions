import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import createDeepLink from "./helpers/createDeepLink";
import getList from "./helpers/getList";
import moveItem from "./helpers/moveItem";
import removeItem from "./helpers/removeItem";
import updateItem from "./helpers/updateItem";
import { App } from "./models";

export default function ApplicationsList() {
  const { data: list, isLoading, revalidate } = usePromise(getList);

  async function handleAppMove(app: App, position: "first" | "last") {
    await moveItem(app, position).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppRemove(app: App) {
    await removeItem(app).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppStick(app: App) {
    await updateItem(app, { isSticky: true }).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to stick application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppUnstick(app: App) {
    await updateItem(app, { isSticky: false }).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to unstick application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No applications found"
        description='Use the "Add application" command to populate this list.'
      />
      {list?.map((item, index) => (
        <List.Item
          key={item.path}
          title={`${index + 1}. ${item.name}`}
          subtitle={item.isSticky ? "⭐" : undefined}
          actions={
            <ActionPanel>
              <Action.Open title="Open" application={item.name} target={item.path} />
              <Action.CreateQuicklink quicklink={{ link: createDeepLink(index + 1) }} />
              <Action
                icon={Icon.ArrowUp}
                title="Move to Top"
                onAction={() => handleAppMove(item, "first")}
                shortcut={{
                  modifiers: ["cmd"],
                  key: "t",
                }}
              />
              <Action
                icon={Icon.ArrowDown}
                title="Move to Bottom"
                onAction={() => handleAppMove(item, "last")}
                shortcut={{
                  modifiers: ["cmd"],
                  key: "b",
                }}
              />
              {item.isSticky ? (
                <Action
                  icon={Icon.StarDisabled}
                  title="Unstick"
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "s",
                  }}
                  onAction={() => handleAppUnstick(item)}
                />
              ) : (
                <Action
                  icon={Icon.Star}
                  title="Sticky"
                  onAction={() => handleAppStick(item)}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "s",
                  }}
                />
              )}
              <Action
                icon={Icon.Trash}
                title="Remove"
                style={Action.Style.Destructive}
                onAction={() => handleAppRemove(item)}
                shortcut={{
                  modifiers: ["cmd"],
                  key: "delete",
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
