import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Assignment } from "../types";
import * as storage from "../storage";

export function useAssignments(classId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    try {
      const loadedAssignments = classId
        ? await storage.getAssignmentsForClass(classId)
        : await storage.getAssignments();
      setAssignments(loadedAssignments);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load assignments",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const createAssignment = useCallback(
    async (assignment: Assignment) => {
      try {
        await storage.addAssignment(assignment);
        await loadAssignments();
        await showToast({
          style: Toast.Style.Success,
          title: "Assignment added",
          message: `${assignment.name} has been added`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add assignment",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadAssignments],
  );

  const updateAssignment = useCallback(
    async (assignment: Assignment) => {
      try {
        await storage.updateAssignment(assignment);
        await loadAssignments();
        await showToast({
          style: Toast.Style.Success,
          title: "Assignment updated",
          message: `${assignment.name} has been updated`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update assignment",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadAssignments],
  );

  const removeAssignment = useCallback(
    async (id: string, name: string) => {
      try {
        await storage.deleteAssignment(id);
        await loadAssignments();
        await showToast({
          style: Toast.Style.Success,
          title: "Assignment deleted",
          message: `${name} has been deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete assignment",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadAssignments],
  );

  return {
    assignments,
    isLoading,
    createAssignment,
    updateAssignment,
    removeAssignment,
    reloadAssignments: loadAssignments,
  };
}
