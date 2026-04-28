import GenericDetailView from "./GenericDetailView";

interface ClusterDetailViewProps {
  clusterId: string;
  clusterName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

export default function ClusterDetailView({
  clusterId,
  clusterName,
  horizonUrl,
  binaryPath,
  configName,
}: ClusterDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={clusterId}
      resourceName={clusterName}
      cliArgs={["coe", "cluster", "show"]}
      cacheKeyPrefix="cluster-detail"
      horizonUrl={horizonUrl}
      horizonResourceType="clusters"
      binaryPath={binaryPath}
      configName={configName}
    />
  );
}
