import GenericDetailView from "./GenericDetailView";

interface FlavorDetailViewProps {
  flavorId: string;
  flavorName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

export default function FlavorDetailView({
  flavorId,
  flavorName,
  horizonUrl,
  binaryPath,
  configName,
}: FlavorDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={flavorId}
      resourceName={flavorName}
      cliArgs={["flavor", "show"]}
      cacheKeyPrefix="flavor-detail"
      horizonUrl={horizonUrl}
      horizonResourceType="flavors"
      binaryPath={binaryPath}
      configName={configName}
      summaryKeys={[
        { key: "vcpus", label: "vCPUs" },
        { key: "ram", label: "RAM (MB)" },
        { key: "disk", label: "Disk (GB)" },
        { key: "id", label: "ID" },
      ]}
    />
  );
}
