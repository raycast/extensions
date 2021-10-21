import Dockerode, { ImageInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import { formatBytes, imageTitle } from './docker/image';
import ErrorDetail from './error_detail';
import ImageDetail from './image_detail';

const useDocker = (docker: Dockerode) => {
  const [isLoading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [error, setError] = useState<Error>();

  const removeImage = async (image: ImageInfo) => {
    setLoading(true);
    await docker.getImage(image.Id).remove();
    const images = await docker.listImages();
    setImages(images);
    setLoading(false);
  };

  return {
    isLoading,
    images,
    error,
    removeImage,
    useImages: () =>
      useEffect(() => {
        async function fetchImages() {
          setLoading(true);
          try {
            const images = await docker.listImages();
            setImages(images);
          } catch (error) {
            if (error instanceof Error) {
              setError(error);
            }
          } finally {
            setLoading(false);
          }
        }
        fetchImages();
      }, []),
  };
};

export default function ImageList() {
  const docker = useMemo(() => new Dockerode(), []);

  const { isLoading, images, useImages, error, removeImage } = useDocker(docker);

  useImages();

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={isLoading}>
      {images.map((image) => (
        <List.Item
          key={image.Id}
          title={imageTitle(image)}
          icon={{ source: Icon.Document, tintColor: Color.Yellow }}
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
