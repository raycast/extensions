import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { type VmListGroup, useVmList } from "@/hooks/use-vm-list";
import { getVmStatusIcon } from "@/utils/ui";
import { NoServersEmptyView } from "@/components/NoServersEmptyView";
import { ServerErrorItem } from "@/components/ServerErrorItem";
import { VmActionPanel } from "@/components/VmActionPanel";
import { VmDetail } from "@/components/VmDetail";
import { VmTypeDropdown } from "@/components/VmTypeDropdown";
import { ManageServers } from "@/screens/ManageServers";

const Command = () => {
  const { isLoading, groups, hasServers, revalidate, mutate, setType } = useVmList();
  const showSections = groups.length > 1;
  const showNoServers = !isLoading && !hasServers;

  const renderGroup = (group: VmListGroup) => {
    const items =
      group.error !== undefined ? (
        <ServerErrorItem
          key={`${group.server.id}/error`}
          server={group.server}
          error={group.error}
          revalidate={revalidate}
        />
      ) : (
        group.vms.map((vm) => (
          <List.Item
            key={`${group.server.id}/${vm.id}`}
            icon={{ ...getVmStatusIcon(vm.status), tooltip: vm.status }}
            title={vm.name}
            actions={<VmActionPanel vm={vm} mutate={mutate} revalidate={revalidate} />}
            keywords={[vm.vmid.toString(), group.server.name]}
            detail={<VmDetail vm={vm} />}
            accessories={[{ text: vm.id }]}
          />
        ))
      );

    return (
      <List.Section
        key={group.server.id}
        title={showSections ? group.server.name : undefined}
        subtitle={showSections && group.error === undefined ? `${group.vms.length}` : undefined}
      >
        {items}
      </List.Section>
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!showNoServers}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action.Push title="Manage Servers" icon={Icon.Gear} target={<ManageServers />} />
        </ActionPanel>
      }
      searchBarAccessory={<VmTypeDropdown onChange={setType} />}
    >
      {showNoServers ? <NoServersEmptyView /> : groups.map(renderGroup)}
    </List>
  );
};

export default Command;
