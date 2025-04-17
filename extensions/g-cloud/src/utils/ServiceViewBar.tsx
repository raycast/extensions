import { useNavigation } from "@raycast/api";
import ProjectView from "../ProjectView";
import { QuickProjectSwitcher } from "./QuickProjectSwitcher";
import { CacheManager } from "./CacheManager";
import { useEffect } from "react";
import StorageBucketView from "../services/storage/StorageBucketView";

interface ServiceViewBarProps {
  projectId: string;
  gcloudPath: string;
  serviceName?: string;
}

export function ServiceViewBar({ projectId, gcloudPath, serviceName }: ServiceViewBarProps) {
  const { push } = useNavigation();

  useEffect(() => {
    CacheManager.ensureRecentlyUsedProjects();
  }, []);

  const handleProjectSelect = (selectedProjectId: string) => {
    if (selectedProjectId === projectId) return;

    if (serviceName) {
      switch (serviceName) {
        case "storage":
          push(<StorageBucketView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
          return;

        default:
          break;
      }
    }

    push(<ProjectView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
  };

  return <QuickProjectSwitcher gcloudPath={gcloudPath} onProjectSelect={handleProjectSelect} />;
}
