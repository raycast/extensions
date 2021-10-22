import Dockerode from '@priithaamer/dockerode';
import { Detail } from '@raycast/api';
import { useMemo } from 'react';
import { useDocker } from './docker';
import { formatImageDetailMarkdown } from './docker/image';

export default function ImageDetail({ imageId }: { imageId: string }) {
  const docker = useMemo(() => new Dockerode(), []);
  const { useImageInfo } = useDocker(docker);
  const { imageInfo, isLoading } = useImageInfo({ Id: imageId });

  return (
    <Detail navigationTitle="Image Details" isLoading={isLoading} markdown={formatImageDetailMarkdown(imageInfo)} />
  );
}
