import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { toggleDomain } from "../libs/api";
import { DomainListItem, Mutate } from "../types/nextdns";
import AddDomain from "./actions/add-domain";

//TODO: Optimize optimistic update
//TODO: Ensure naming, site or domain?
export function ListItem(props: { siteItem: DomainListItem, type: "allow" | "deny", mutate: Mutate }) {
  const { siteItem, type, mutate } = props;

  return (
    <List.Item
      title={`*.${siteItem.id}`}
      icon={
        siteItem.active
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      actions={<Actions item={siteItem} type={type} mutate={mutate} />}
    />
  );
}


function Actions({
  item,
  type,
  mutate
}: {
  item: DomainListItem;
  type: "allow" | "deny";
  mutate: Mutate
}) {
  async function toggle(item: DomainListItem) {
    const newStatus = !item.active;
    const { id, type } = item;

    const toast = await showToast({ style: Toast.Style.Animated, title: newStatus ? "Activating Site" : "Deactivating Site" });
    try {
      await mutate(
        toggleDomain({ element: {id, type, active: newStatus} }),
        {
          optimisticUpdate(data) {
            const { result, profileName } = data;
            const index = result.findIndex(item => item.id===id);
            result[index].active = newStatus;
            return { result, profileName };
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = newStatus ? "Activated Site" : "Deactivated Site";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${newStatus ? "Activate" : "Deactivate"} Site`;
    }
  }

  return (
    <ActionPanel title={`Manage ${item.id}`}>
      <Action
        title={`${item.active ? "Deactivate" : "Activate"} Domain`}
        icon={item.active ? Icon.XMarkCircle : Icon.CheckCircle}
        onAction={() => toggle(item)}
      />
      <Action.Push icon={Icon.Plus} title="Add New Site" target={<AddDomain type={type} mutate={mutate} />} />
    </ActionPanel>
  );
}