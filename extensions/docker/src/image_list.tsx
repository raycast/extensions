import { Color, Detail, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';
import Dockerode, { ImageInfo } from '@priithaamer/dockerode';
import { formatBytes } from './docker/image';

export default function ImageList() {
  const [images, setImages] = useState<{ images: ImageInfo[] }>({ images: [] });
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function fetchImages() {
      try {
        const docker = new Dockerode();
        const images = await docker.listImages();
        setImages({ images });
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        }
      }
    }
    fetchImages();
  }, []);

  if (error) {
    return <Detail markdown={`## Error connecting to Docker\n\n${error.message}\n`} />;
  }

  return (
    <List>
      {images.images.map((image) => (
        <List.Item
          key={image.Id}
          title={image.RepoTags.join(', ')}
          icon={{ source: Icon.Document, tintColor: Color.Yellow }}
          accessoryTitle={formatBytes(image.Size) ?? ''}
        />
      ))}
    </List>
  );
}
