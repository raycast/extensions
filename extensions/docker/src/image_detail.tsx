import { Detail } from '@raycast/api';
import { useDocker } from './docker';
import { useDockerode } from './docker/dockerode';
import { formatImageDetailMarkdown } from './docker/image';

export default function ImageDetail({ imageId }: { imageId: string }) {
  const docker = useDockerode();
  const { useImageInfo } = useDocker(docker);
  const { imageInfo, isLoading } = useImageInfo({ Id: imageId });

  return (
    <Detail navigationTitle="Image Details" isLoading={isLoading} markdown={formatImageDetailMarkdown(imageInfo)} />
  );
}
