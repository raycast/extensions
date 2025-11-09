import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Class } from "../types";
import * as storage from "../storage";

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadClasses = useCallback(async () => {
    try {
      const loadedClasses = await storage.getClasses();
      setClasses(loadedClasses);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load classes",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const createClass = useCallback(
    async (classItem: Class) => {
      try {
        await storage.addClass(classItem);
        await loadClasses();
        await showToast({
          style: Toast.Style.Success,
          title: "Class added",
          message: `${classItem.name} has been added`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add class",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClasses],
  );

  const updateClass = useCallback(
    async (classItem: Class) => {
      try {
        await storage.updateClass(classItem);
        await loadClasses();
        await showToast({
          style: Toast.Style.Success,
          title: "Class updated",
          message: `${classItem.name} has been updated`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update class",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClasses],
  );

  const removeClass = useCallback(
    async (id: string, name: string) => {
      try {
        await storage.deleteClass(id);
        await loadClasses();
        await showToast({
          style: Toast.Style.Success,
          title: "Class deleted",
          message: `${name} has been deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete class",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClasses],
  );

  return {
    classes,
    isLoading,
    createClass,
    updateClass,
    removeClass,
    reloadClasses: loadClasses,
  };
}
