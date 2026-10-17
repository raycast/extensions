import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ContainerActions } from "./components/ContainerActions";
import { ContainerDetail } from "./components/ContainerDetail";
import { ErrorView } from "./components/ErrorView";
import { useContainers } from "./hooks/useContainers";
import { stateColor, stateIcon } from "./lib/constants";
import { toContainerVM, type ContainerVM } from "./lib/types";

function ContainerRow({ container, revalidate }: { container: ContainerVM; revalidate: () => void }) {
  return (
    <List.Item
      title={container.id}
      subtitle={container.imageShort}
      icon={{ source: stateIcon(container.state), tintColor: stateColor(container.state) }}
      keywords={[container.image, container.state, container.ip ?? ""]}
      accessories={[
        ...(container.ip ? [{ text: container.ip }] : []),
        { tag: { value: container.state, color: stateColor(container.state) } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Inspect" icon={Icon.Eye} target={<ContainerDetail id={container.id} />} />
          <ContainerActions container={container} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [showAll, setShowAll] = useState(true);
  const { data, isLoading, error, revalidate } = useContainers(showAll);

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const containers = (data ?? []).map(toContainerVM);
  const running = containers.filter((container) => container.isRunning);
  const stopped = containers.filter((container) => !container.isRunning);

  const toggleShowAll = (
    <Action
      title={showAll ? "Show Running Only" : "Show All"}
      icon={Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => setShowAll((value) => !value)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter containers by id, image, or state…">
      <List.EmptyView
        icon={Icon.Box}
        title={showAll ? "No Containers" : "No Running Containers"}
        description={showAll ? "Run an image to create a container." : "Toggle to show all containers (⌘⇧A)."}
        actions={<ActionPanel>{toggleShowAll}</ActionPanel>}
      />
      <List.Section title="Running" subtitle={running.length > 0 ? String(running.length) : undefined}>
        {running.map((container) => (
          <ContainerRow key={container.id} container={container} revalidate={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Stopped" subtitle={stopped.length > 0 ? String(stopped.length) : undefined}>
        {stopped.map((container) => (
          <ContainerRow key={container.id} container={container} revalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
