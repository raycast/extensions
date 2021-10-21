import Dockerode, { ImageInspectInfo } from '@priithaamer/dockerode';
import { Detail } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import { formatImageDetailMarkdown } from './docker/image';

export default function ImageDetail({ imageId }: { imageId: string }) {
  const docker = useMemo(() => new Dockerode(), []);
  const [imageInfo, setImageInfo] = useState<ImageInspectInfo>();
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchImageInfo() {
      setLoading(true);
      const imageInfo = await docker.getImage(imageId).inspect();
      setImageInfo(imageInfo);
      setLoading(false);
    }
    fetchImageInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Detail navigationTitle="Image Details" isLoading={isLoading} markdown={formatImageDetailMarkdown(imageInfo)} />
  );
}
