import GenericDetailView from "./GenericDetailView";

interface NetworkDetailViewProps {
  networkId: string;
  networkName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

export default function NetworkDetailView({
  networkId,
  networkName,
  horizonUrl,
  binaryPath,
  configName,
}: NetworkDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={networkId}
      resourceName={networkName}
      cliArgs={["network", "show"]}
      cacheKeyPrefix="network-detail"
      horizonUrl={horizonUrl}
      horizonResourceType="networks"
      binaryPath={binaryPath}
      configName={configName}
    />
  );
}
