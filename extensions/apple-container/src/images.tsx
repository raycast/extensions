import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ErrorView } from "./components/ErrorView";
import { ImageActions } from "./components/ImageActions";
import { ImageDetail } from "./components/ImageDetail";
import { PullImageForm } from "./components/PullImageForm";
import { useImages } from "./hooks/useImages";
import { toImageVM, type ImageVM } from "./lib/types";

function ImageRow({ image, revalidate }: { image: ImageVM; revalidate: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  for (const arch of image.architectures) {
    accessories.push({ tag: arch });
  }
  accessories.push({ text: image.size });

  return (
    <List.Item
      title={image.nameShort}
      icon={Icon.HardDrive}
      keywords={[image.name, image.id]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Inspect" icon={Icon.Eye} target={<ImageDetail image={image} revalidate={revalidate} />} />
          <ImageActions image={image} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useImages();

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const images = (data ?? []).map(toImageVM);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter images by reference…">
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No Images"
        description="Pull an image to get started."
        actions={
          <ActionPanel>
            <Action.Push title="Pull Image…" icon={Icon.Download} target={<PullImageForm onPulled={revalidate} />} />
          </ActionPanel>
        }
      />
      {images.map((image) => (
        <ImageRow key={image.key} image={image} revalidate={revalidate} />
      ))}
    </List>
  );
}
