import GenericDetailView from "./GenericDetailView";

interface ImageDetailViewProps {
  imageId: string;
  imageName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

export default function ImageDetailView({
  imageId,
  imageName,
  horizonUrl,
  binaryPath,
  configName,
}: ImageDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={imageId}
      resourceName={imageName}
      cliArgs={["image", "show"]}
      cacheKeyPrefix="image-detail"
      horizonUrl={horizonUrl}
      horizonResourceType="images"
      binaryPath={binaryPath}
      configName={configName}
      summaryKeys={[
        { key: "container_format", label: "Container Format" },
        { key: "os_distro", label: "OS Distro" },
        { key: "visibility", label: "Visibility" },
        { key: "disk_format", label: "Disk Format" },
        { key: "size", label: "Size", format: "size_gib" },
      ]}
    />
  );
}
