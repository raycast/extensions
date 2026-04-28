import GenericDetailView from "./GenericDetailView";

interface FlavorDetailViewProps {
  flavorId: string;
  flavorName: string;
  binaryPath: string;
  configName: string;
}

export default function FlavorDetailView({ flavorId, flavorName, binaryPath, configName }: FlavorDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={flavorId}
      resourceName={flavorName}
      cliArgs={["flavor", "show"]}
      cacheKeyPrefix="flavor-detail"
      binaryPath={binaryPath}
      configName={configName}
    />
  );
}
