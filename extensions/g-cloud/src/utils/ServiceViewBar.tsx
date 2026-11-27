import { useNavigation } from "@raycast/api";
import ProjectView from "../ProjectView";
import { QuickProjectSwitcher } from "./QuickProjectSwitcher";
import { CacheManager, ResourceType } from "./CacheManager";
import { useEffect } from "react";
import StorageBucketView from "../services/storage/StorageBucketView";
import ComputeInstancesView from "../services/compute/ComputeInstancesView";
import CloudRunView from "../services/cloudrun/CloudRunView";
import CloudFunctionsView from "../services/cloudfunctions/CloudFunctionsView";
import CloudSqlView from "../services/cloudsql/CloudSqlView";
import IAMView from "../services/iam/IAMView";
import NetworkView from "../services/network/NetworkView";
import SecretListView from "../services/secrets/SecretListView";
import LogsView from "../services/logs-service/LogsView";

interface ServiceViewBarProps {
  projectId: string;
  gcloudPath: string;
  serviceName?: ResourceType;
  onProjectChange?: (projectId: string) => void;
}

export function ServiceViewBar({ projectId, gcloudPath, serviceName, onProjectChange }: ServiceViewBarProps) {
  const { push } = useNavigation();

  useEffect(() => {
    CacheManager.ensureRecentlyUsedProjects();
  }, []);

  const handleProjectSelect = (selectedProjectId: string) => {
    if (!selectedProjectId || selectedProjectId === projectId) return;

    if (onProjectChange) {
      onProjectChange(selectedProjectId);
      return;
    }

    switch (serviceName) {
      case "compute":
        push(<ComputeInstancesView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "storage":
        push(<StorageBucketView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "cloudrun":
        push(<CloudRunView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "cloudfunctions":
        push(<CloudFunctionsView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "cloudsql":
        push(<CloudSqlView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "iam":
        push(<IAMView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "network":
        push(<NetworkView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "secrets":
        push(<SecretListView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      case "logs":
        push(<LogsView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
        return;
      default:
        push(<ProjectView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
    }
  };

  return (
    <QuickProjectSwitcher gcloudPath={gcloudPath} currentProjectId={projectId} onProjectSelect={handleProjectSelect} />
  );
}
