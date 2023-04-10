import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useDocker } from './docker';
import { useDockerode } from './docker/dockerode';
import { formatBytes, imageTitle } from './docker/image';
import ErrorDetail from './error_detail';
import ImageDetail from './image_detail';
import { withToast } from './ui/toast';

export default function ImageList() {
  const docker = useDockerode();
  const { useImages } = useDocker(docker);
  const { images, isLoading, error, removeImage } = useImages();

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={isLoading}>
      {images?.map((image) => (
        <List.Item
          key={image.Id}
          title={imageTitle(image)}
          icon={{ source: 'icon-image.png', tintColor: Color.SecondaryText }}
          accessoryTitle={formatBytes(image.Size) ?? ''}
          actions={
            <ActionPanel title={imageTitle(image)}>
              <Action.Push
                title="Inspect"
                icon={{ source: Icon.Binoculars }}
                shortcut={{ modifiers: ['cmd'], key: 'i' }}
                target={<ImageDetail imageId={image.Id} />}
              />
              <Action
                title="Remove Image"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
                onAction={withToast({
                  action: () => removeImage(image),
                  onSuccess: () => `Image ${imageTitle(image)} removed`,
                  onFailure: ({ message }) => message,
                })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
