import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import QuicklinkActions from "./components/QuicklinkActions";
import getList from "./helpers/getList";
import moveItem from "./helpers/moveItem";
import removeItem from "./helpers/removeItem";
import updateItem from "./helpers/updateItem";

export default function ApplicationsList() {
  const { data: list, isLoading, revalidate } = usePromise(getList);

  async function handleAppMove(index: number, position: "first" | "last") {
    await moveItem(index, position).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppRemove(index: number) {
    await removeItem(index).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppStick(index: number) {
    await updateItem(index, { isSticky: true }).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to stick application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleAppUnstick(index: number) {
    await updateItem(index, { isSticky: false }).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to unstick application",
        message: error instanceof Error ? error.message : `${error}`,
      });
    });

    await revalidate();
  }

  async function handleBlankRemove(index: number) {
    await removeItem(index).catch((error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove blank entry",
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
      {list?.map((item, index) =>
        item ? (
          <List.Item
            key={`${index}-${item.path}`}
            title={`${index + 1}. ${item.name}`}
            subtitle={item.isSticky ? "⭐" : undefined}
            actions={
              <ActionPanel>
                <Action.Open title="Open" application={item.name} target={item.path} />
                <Action
                  icon={Icon.ArrowUp}
                  title="Move to Top"
                  onAction={() => handleAppMove(index, "first")}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "t",
                  }}
                />
                <Action
                  icon={Icon.ArrowDown}
                  title="Move to Bottom"
                  onAction={() => handleAppMove(index, "last")}
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
                    onAction={() => handleAppUnstick(index)}
                  />
                ) : (
                  <Action
                    icon={Icon.Star}
                    title="Sticky"
                    onAction={() => handleAppStick(index)}
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
                  onAction={() => handleAppRemove(index)}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "d",
                  }}
                />
                <QuicklinkActions index={index} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={`empty-${index}`}
            title={`${index + 1}.`}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Remove"
                  style={Action.Style.Destructive}
                  onAction={() => handleBlankRemove(index)}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "d",
                  }}
                />
                <QuicklinkActions index={index} />
              </ActionPanel>
            }
          />
        )
      )}
    </List>
  );
}
