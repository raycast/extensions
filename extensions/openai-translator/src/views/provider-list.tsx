import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { ProvidersHook, Record } from "../hooks/useProvider";
import { ProviderForm } from "./provider-form";

export interface ProviderListProps {
  hook: ProvidersHook;
}

export function ProviderList(props: ProviderListProps) {
  const { push, pop } = useNavigation();
  const { hook } = props;
  const isSelecting = (record: Record) => {
    return hook.selected?.id == record.id;
  };

  const createForm = (target: Record | undefined) => (
    <ProviderForm record={target} hook={hook} onDone={pop} onCancel={pop} />
  );

  const providerActionPanel = (item: Record) => (
    <ActionPanel>
      {item.id != hook.selected?.id && (
        <Action
          title="Select"
          icon={{ source: Icon.Check }}
          onAction={async () => {
            hook.setSelected(item);
          }}
        />
      )}
      <Action title="Edit..." icon={{ source: Icon.Pencil }} onAction={() => push(createForm(item))} />
      <Action
        title="Create New..."
        icon={{ source: Icon.Plus }}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => push(createForm(undefined))}
      />
      <Action
        title="Delete"
        icon={{ source: Icon.Trash, tintColor: "red" }}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        style={Action.Style.Destructive}
        onAction={async () => {
          await confirmAlert({
            title: "Delete Provider",
            message: `Are you sure you want to delete ${item.props.name}?`,
            primaryAction: {
              title: "Delete",
              onAction: async () => {
                hook.remove(item);
              },
            },
          });
        }}
      />
    </ActionPanel>
  );

  const emptyData = () => {
    showToast({
      title: "Custom providers is empty",
      message: "at least 1 provider is required.",
      style: Toast.Style.Failure,
    });
    return <ProviderForm record={undefined} hook={hook} />;
  };

  return hook.isLoading || hook.data?.length != 0 ? (
    <List isLoading={hook.isLoading}>
      {hook.data?.map((item) => (
        <List.Item
          id={item.id}
          key={item.id}
          icon={{ source: `ic_${item.type}.png` }}
          title={item.props.name}
          accessories={[{ icon: isSelecting(item) ? Icon.CheckCircle : Icon.Circle }]}
          actions={providerActionPanel(item)}
        />
      ))}
    </List>
  ) : (
    emptyData()
  );
}
