import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import { availableMoveProjects, createSubmissionGate, type SubmissionGate } from "./taskFormModel";

export interface MoveTaskFormProps {
  currentProjectId: string;
  projects: readonly Project[];
  onMove(targetProjectId: string): Promise<void>;
}

export default function MoveTaskForm({ currentProjectId, projects, onMove }: MoveTaskFormProps) {
  const destinations = useMemo(() => availableMoveProjects(projects, currentProjectId), [currentProjectId, projects]);
  const [isLoading, setIsLoading] = useState(false);
  const mounted = useRef(true);
  const submissionGate = useRef<SubmissionGate | undefined>(undefined);
  if (!submissionGate.current) {
    submissionGate.current = createSubmissionGate((submitting) => {
      if (mounted.current) setIsLoading(submitting);
    });
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const move = (targetProjectId: string) =>
    submissionGate.current!.submit(async () => {
      try {
        await onMove(targetProjectId);
      } catch (error) {
        const title = error instanceof AmbiguousMutationError ? "Task Move Status Unknown" : "Task Could Not Be Moved";
        try {
          await showToast({ style: Toast.Style.Failure, title });
        } catch {
          // Preserve and rethrow the original mutation error.
        }
        throw error;
      }

      try {
        await showToast({ style: Toast.Style.Success, title: "Task Moved" });
      } catch {
        // A notification failure cannot turn a confirmed move into a retryable mutation.
      }
    });

  return (
    <List filtering isLoading={isLoading} searchBarPlaceholder="Search lists...">
      {destinations.length === 0 ? (
        <List.EmptyView title="No Other Lists" />
      ) : (
        destinations.map((project) => (
          <List.Item
            key={project.id}
            id={project.id}
            title={project.name}
            icon={Icon.List}
            actions={
              <ActionPanel>
                <Action title="Move Here" icon={Icon.ArrowRight} onAction={() => move(project.id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
