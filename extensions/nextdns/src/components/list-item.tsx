import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { removeDomain, toggleDomain } from "../libs/api";
import { DomainListItem, Mutate } from "../types";
import AddDomain from "./add-domain";
import { getIcon } from "../libs/utils";

export function ListItem(props: { domainItem: DomainListItem; mutate: Mutate }) {
  const { domainItem, mutate } = props;

  return (
    <List.Item
      title={`*.${domainItem.id}`}
      icon={{ source: getIcon(domainItem), fallback: Icon.Image }}
      accessories={[
        {
          tag: domainItem.active
            ? { color: Color.Green, value: "Activated" }
            : { color: Color.Red, value: "Deactivated" },
        },
      ]}
      actions={<Actions item={domainItem} mutate={mutate} />}
    />
  );
}

function Actions({ item, mutate }: { item: DomainListItem; mutate: Mutate }) {
  async function toggle(item: DomainListItem) {
    const newStatus = !item.active;
    const { id, type } = item;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: newStatus ? "Activating domain" : "deactivating domain",
    });
    try {
      await mutate(toggleDomain({ element: { id, type, active: newStatus } }), {
        optimisticUpdate(data) {
          const { result, profileName } = data;
          const index = result.findIndex((item) => item.id === id);
          result[index].active = newStatus;
          return { result, profileName };
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = newStatus ? "Activated domain" : "deactivated domain";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${newStatus ? "activate" : "deactivate"} domain`;
    }
  }

  async function removeItem(element: DomainListItem) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing domain",
    });

    try {
      await mutate(removeDomain({ element }), {
        optimisticUpdate(data) {
          if (!data) return {};

          const list = data?.result || [];
          const index = list.findIndex((item) => item.id === element.id);

          if (index !== -1) {
            list.splice(index, 1);
          }

          return { ...data, result: list };
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Removed domain";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not remove domain`;
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title={`Manage ${item.id}`}>
        <Action
          title={`${item.active ? "Deactivate" : "Activate"} Domain`}
          icon={item.active ? Icon.XMarkCircle : Icon.CheckCircle}
          onAction={() => toggle(item)}
        />
        <Action
          title={`Delete Domain`}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => removeItem(item)}
        />
      </ActionPanel.Section>
      <Action.Push
        icon={Icon.Plus}
        title="Add New Domain"
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddDomain type={item.type} mutate={mutate} />}
      />
    </ActionPanel>
  );
}
