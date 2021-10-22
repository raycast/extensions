import Dockerode from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from '@raycast/api';
import { useMemo } from 'react';
import { useDocker } from './docker';
import { formatBytes, imageTitle } from './docker/image';
import ErrorDetail from './error_detail';
import ImageDetail from './image_detail';

export default function ImageList() {
  const docker = useMemo(() => new Dockerode(), []);

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
          icon={{ source: Icon.Document }}
          accessoryTitle={formatBytes(image.Size) ?? ''}
          actions={
            <ActionPanel title={imageTitle(image)}>
              <PushAction
                title="Inspect"
                icon={{ source: Icon.Binoculars }}
                shortcut={{ modifiers: ['cmd'], key: 'i' }}
                target={<ImageDetail imageId={image.Id} />}
              />
              <ActionPanel.Item
                title="Remove Image"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
                onAction={async () => {
                  await removeImage(image);
                  await showToast(ToastStyle.Success, `Image ${imageTitle(image)} removed`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
