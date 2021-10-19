import { Color, Detail, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';
import Dockerode, { ImageInfo } from '@priithaamer/dockerode';

export default function ImageList() {
  const [images, setImages] = useState<{ images: ImageInfo[] }>({ images: [] });
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function fetchContainers() {
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
    fetchContainers();
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

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
