import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { ClassType } from "../types";
import * as storage from "../storage";

export function useClassTypes() {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadClassTypes = useCallback(async () => {
    try {
      const loadedClassTypes = await storage.getClassTypes();
      setClassTypes(loadedClassTypes);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load class types",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassTypes();
  }, [loadClassTypes]);

  const createClassType = useCallback(
    async (classType: ClassType) => {
      try {
        await storage.addClassType(classType);
        await loadClassTypes();
        await showToast({
          style: Toast.Style.Success,
          title: "Class type added",
          message: `${classType.name} has been added`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add class type",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClassTypes],
  );

  const updateClassType = useCallback(
    async (classType: ClassType) => {
      try {
        await storage.updateClassType(classType);
        await loadClassTypes();
        await showToast({
          style: Toast.Style.Success,
          title: "Class type updated",
          message: `${classType.name} has been updated`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update class type",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClassTypes],
  );

  const removeClassType = useCallback(
    async (id: string, name: string) => {
      try {
        await storage.deleteClassType(id);
        await loadClassTypes();
        await showToast({
          style: Toast.Style.Success,
          title: "Class type deleted",
          message: `${name} has been deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete class type",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [loadClassTypes],
  );

  return {
    classTypes,
    isLoading,
    createClassType,
    updateClassType,
    removeClassType,
    reloadClassTypes: loadClassTypes,
  };
}
