import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

async function fetchStatus() {
  // Replace with background status query
  return {
    unreadCount: 2,
    activeTasks: [
      { id: "1", title: "Review PR #23", url: "https://github.com" },
      { id: "2", title: "Deploy Staging Build", url: "https://github.com" },
    ],
  };
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchStatus, [], {
    keepPreviousData: true,
  });

  const count = data?.unreadCount ?? 0;

  return (
    <MenuBarExtra
      icon={Icon.CheckCircle}
      title={count > 0 ? `${count}` : undefined}
      tooltip="iPF Workload Monitor"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Active Queue">
        {data?.activeTasks.map((task) => (
          <MenuBarExtra.Item
            key={task.id}
            title={task.title}
            onAction={() => open(task.url)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Extension"
          onAction={() => open("raycast://extensions/joseph_emmanuel/ipf-os/my-tickets")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
