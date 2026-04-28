import GenericDetailView from "./GenericDetailView";

interface ServerDetailViewProps {
  serverId: string;
  serverName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

export default function ServerDetailView({
  serverId,
  serverName,
  horizonUrl,
  binaryPath,
  configName,
}: ServerDetailViewProps) {
  return (
    <GenericDetailView
      resourceId={serverId}
      resourceName={serverName}
      cliArgs={["server", "show"]}
      cacheKeyPrefix="server-detail"
      horizonUrl={horizonUrl}
      horizonResourceType="servers"
      binaryPath={binaryPath}
      configName={configName}
    />
  );
}
