import { useEffect, useState, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { AppData, Course, ScheduleGroup } from "../types";
import { loadAppData, saveAppData } from "../storage";
import { purgeExpiredEphemeral } from "../schedule-utils";
import { uuid } from "../utils";

export interface UseAppDataReturn {
  data: AppData;
  isLoading: boolean;
  activeGroup: ScheduleGroup | undefined;
  createGroup: (name: string) => Promise<ScheduleGroup>;
  deleteGroup: (groupId: string) => Promise<void>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<void>;
  unarchiveGroup: (groupId: string) => Promise<void>;
  setActiveGroup: (groupId: string) => Promise<void>;
  addCourse: (groupId: string, course: Omit<Course, "id">) => Promise<Course>;
  updateCourse: (groupId: string, updated: Course) => Promise<void>;
  deleteCourse: (groupId: string, courseId: string) => Promise<void>;
  duplicateCourse: (groupId: string, course: Course) => Promise<Course>;
  refreshData: () => Promise<void>;
  importData: (newData: AppData) => Promise<void>;
}

export function useAppData(): UseAppDataReturn {
  const [data, setData] = useState<AppData>({ groups: [], activeGroupId: null });
  const [isLoading, setIsLoading] = useState(true);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refreshData = useCallback(async () => {
    try {
      const loaded = await loadAppData();

      // Purge expired ephemeral entries from all groups
      const purgedGroups = loaded.groups.map((group) => ({
        ...group,
        courses: purgeExpiredEphemeral(group.courses),
      }));

      const updatedData: AppData = {
        ...loaded,
        groups: purgedGroups,
      };

      setData(updatedData);

      // Save if any courses were purged
      const wasPurged = purgedGroups.some((group, i) => group.courses.length !== loaded.groups[i].courses.length);
      if (wasPurged) {
        await saveAppData(updatedData);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const persistData = useCallback(async (newData: AppData) => {
    try {
      await saveAppData(newData);
      setData(newData);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, []);

  const importData = useCallback(
    async (newData: AppData) => {
      await persistData(newData);
    },
    [persistData],
  );

  const createGroup = useCallback(
    async (name: string): Promise<ScheduleGroup> => {
      const newGroup: ScheduleGroup = {
        id: uuid(),
        name,
        courses: [],
        createdAt: new Date().toISOString(),
        archived: false,
      };

      const newData: AppData = {
        ...dataRef.current,
        groups: [...dataRef.current.groups, newGroup],
        // Auto-activate if this is the first group (no current active group)
        activeGroupId: dataRef.current.activeGroupId ?? newGroup.id,
      };

      await persistData(newData);
      return newGroup;
    },
    [persistData],
  );

  const deleteGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const newData: AppData = {
        ...dataRef.current,
        groups: dataRef.current.groups.filter((g) => g.id !== groupId),
        activeGroupId: dataRef.current.activeGroupId === groupId ? null : dataRef.current.activeGroupId,
      };

      await persistData(newData);
    },
    [persistData],
  );

  const renameGroup = useCallback(
    async (groupId: string, name: string): Promise<void> => {
      const newData: AppData = {
        ...dataRef.current,
        groups: dataRef.current.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
      };
      await persistData(newData);
    },
    [persistData],
  );

  const archiveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const newData: AppData = {
        ...dataRef.current,
        groups: dataRef.current.groups.map((g) => (g.id === groupId ? { ...g, archived: true } : g)),
        activeGroupId: dataRef.current.activeGroupId === groupId ? null : dataRef.current.activeGroupId,
      };
      await persistData(newData);
    },
    [persistData],
  );

  const unarchiveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const newData: AppData = {
        ...dataRef.current,
        groups: dataRef.current.groups.map((g) => (g.id === groupId ? { ...g, archived: false } : g)),
      };
      await persistData(newData);
    },
    [persistData],
  );

  const setActiveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      const group = dataRef.current.groups.find((g) => g.id === groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      const newData: AppData = {
        ...dataRef.current,
        activeGroupId: groupId,
      };

      await persistData(newData);
    },
    [persistData],
  );

  const addCourse = useCallback(
    async (groupId: string, course: Omit<Course, "id">): Promise<Course> => {
      const group = dataRef.current.groups.find((g) => g.id === groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      const newCourse: Course = {
        ...course,
        id: uuid(),
      };

      const newGroups = dataRef.current.groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            courses: [...g.courses, newCourse],
          };
        }
        return g;
      });

      const newData: AppData = {
        ...dataRef.current,
        groups: newGroups,
      };

      await persistData(newData);
      return newCourse;
    },
    [persistData],
  );

  const updateCourse = useCallback(
    async (groupId: string, updated: Course): Promise<void> => {
      const group = dataRef.current.groups.find((g) => g.id === groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      const courseIndex = group.courses.findIndex((c) => c.id === updated.id);
      if (courseIndex === -1) {
        throw new Error(`Course ${updated.id} not found in group ${groupId}`);
      }

      const newGroups = dataRef.current.groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            courses: g.courses.map((c) => (c.id === updated.id ? updated : c)),
          };
        }
        return g;
      });

      const newData: AppData = {
        ...dataRef.current,
        groups: newGroups,
      };

      await persistData(newData);
    },
    [persistData],
  );

  const deleteCourse = useCallback(
    async (groupId: string, courseId: string): Promise<void> => {
      const group = dataRef.current.groups.find((g) => g.id === groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      const newGroups = dataRef.current.groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            courses: g.courses.filter((c) => c.id !== courseId),
          };
        }
        return g;
      });

      const newData: AppData = {
        ...dataRef.current,
        groups: newGroups,
      };

      await persistData(newData);
    },
    [persistData],
  );

  const duplicateCourse = useCallback(
    async (groupId: string, course: Course): Promise<Course> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = course;
      const copy: Omit<Course, "id"> = {
        ...rest,
        title: `${course.title} (Copy)`,
        // Reassign slot IDs so there are no duplicate slot IDs
        schedules: course.schedules.map((s) => ({ ...s, id: uuid() })),
        ephemeral: false,
        expiresAt: undefined,
      };
      return addCourse(groupId, copy);
    },
    [dataRef, addCourse],
  );

  const activeGroup = data.activeGroupId ? data.groups.find((g) => g.id === data.activeGroupId) : undefined;

  return {
    data,
    isLoading,
    activeGroup,
    createGroup,
    deleteGroup,
    renameGroup,
    archiveGroup,
    unarchiveGroup,
    setActiveGroup,
    addCourse,
    updateCourse,
    deleteCourse,
    duplicateCourse,
    refreshData,
    importData,
  };
}
