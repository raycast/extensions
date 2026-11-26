// Cloud Composer (managed Airflow) service entry from the hub: environments in the selected project
// (switchable from the dropdown), drilling into DAGs -> runs -> tasks -> logs, performance,
// and dataset lineage. Read-only: it never triggers, clears, pauses or edits anything.

import { useEffect } from "react";
import { useCurrentProject, useProjectProp } from "./lib/raycast";
import { EnvironmentsList } from "./views/environments-list";

interface ComposerViewProps {
  projectId: string;
  gcloudPath: string;
  /** Called when the project is switched inside Composer, so the hub's selection follows. */
  onProjectChange?: (projectId: string) => void;
}

export default function ComposerView({ projectId, gcloudPath, onProjectChange }: ComposerViewProps) {
  useProjectProp(projectId, gcloudPath);
  const current = useCurrentProject();
  useEffect(() => {
    if (current && current !== projectId) onProjectChange?.(current);
  }, [current]);
  return <EnvironmentsList />;
}
