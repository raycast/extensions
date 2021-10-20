import { ActionPanel, Color, Detail, Icon, List, PushAction } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Dockerode, { ImageInfo } from '@priithaamer/dockerode';
import ImageDetail from './image_detail';
import { formatBytes, imageTitle } from './docker/image';

export default function ImageList() {
  const docker = useMemo(() => new Dockerode(), []);
  const [images, setImages] = useState<{ images: ImageInfo[] }>({ images: [] });
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function fetchImages() {
      try {
        const images = await docker.listImages();
        setImages({ images });
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        }
      }
    }
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <Detail markdown={`## Error connecting to Docker\n\n${error.message}\n`} />;
  }

  return (
    <List>
      {images.images.map((image) => (
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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
