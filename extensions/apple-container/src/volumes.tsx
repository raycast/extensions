import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateVolumeForm } from "./components/CreateVolumeForm";
import { ErrorView } from "./components/ErrorView";
import { VolumeActions } from "./components/VolumeActions";
import { VolumeDetail } from "./components/VolumeDetail";
import { useVolumes } from "./hooks/useVolumes";
import { toVolumeVM, type VolumeVM } from "./lib/types";

function VolumeRow({ volume, revalidate }: { volume: VolumeVM; revalidate: () => void }) {
  return (
    <List.Item
      title={volume.name}
      icon={Icon.Folder}
      keywords={[volume.driver, volume.format ?? ""]}
      accessories={[{ tag: volume.driver }, { text: volume.size }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Inspect"
            icon={Icon.Eye}
            target={<VolumeDetail volume={volume} revalidate={revalidate} />}
          />
          <VolumeActions volume={volume} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useVolumes();

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const volumes = (data ?? []).map(toVolumeVM);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter volumes by name…">
      <List.EmptyView
        icon={Icon.Folder}
        title="No Volumes"
        description="Create a volume to persist data."
        actions={
          <ActionPanel>
            <Action.Push title="Create Volume…" icon={Icon.Plus} target={<CreateVolumeForm onCreated={revalidate} />} />
          </ActionPanel>
        }
      />
      {volumes.map((volume) => (
        <VolumeRow key={volume.name} volume={volume} revalidate={revalidate} />
      ))}
    </List>
  );
}
