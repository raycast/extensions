import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { removeDomain, toggleDomain } from "../libs/api";
import { DomainListItem, Mutate } from "../types/nextdns";
import AddDomain from "./actions/add-domain";

//TODO: Optimize optimistic update
//TODO: Ensure naming, site or domain?
export function ListItem(props: { domainItem: DomainListItem; mutate: Mutate }) {
  const { domainItem, mutate } = props;

  return (
    <List.Item
      title={`*.${domainItem.id}`}
      icon={
        domainItem.active
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
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
      title: newStatus ? "Activating Domain" : "Deactivating Domain",
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
      toast.title = newStatus ? "Activated Domain" : "Deactivated Domain";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${newStatus ? "Activate" : "Deactivate"} Domain`;
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
          onAction={() => removeDomain({ element: item })}
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
