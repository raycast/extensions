import GenericDetailView from "./GenericDetailView";

interface ImageDetailViewProps {
  imageId: string;
  imageName: string;
  binaryPath: string;
  configName: string;
}

export default function ImageDetailView({ imageId, imageName, binaryPath, configName }: ImageDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={imageId}
      resourceName={imageName}
      cliArgs={["image", "show"]}
      cacheKeyPrefix="image-detail"
      binaryPath={binaryPath}
      configName={configName}
    />
  );
}
