import { useEffect, useState } from "react";
import { LocalStorage, Toast, showToast } from "@raycast/api";
import { loadSavedData } from "../utils";

import type { EpicData, NewEpicData } from "../types";
import { EPICS_STORAGE_KEY } from "../consts";

export const useEpics = () => {
  const [epics, setEpics] = useState<EpicData[] | undefined>(undefined);

  useEffect(() => {
    loadSavedData().then(({ epics }) => {
      setEpics(epics);
    });
  }, []);

  useEffect(() => {
    if (epics === undefined) return;
    LocalStorage.setItem(EPICS_STORAGE_KEY, JSON.stringify(epics));
  }, [epics]);

  const addEpic = (data: NewEpicData): boolean => {
    if (epics === undefined) return false;

    const { name, description } = data;

    if (epics.find((epic) => epic.name === name)) {
      showToast({
        title: "Epic with this name already exists",
        style: Toast.Style.Failure,
      });
      return false;
    }

    if (!name) {
      showToast({
        title: "Empty epic name",
        style: Toast.Style.Failure,
      });
      return false;
    }

    setEpics([
      ...epics,
      {
        name,
        addedTimestamp: Date.now(),
        description,
      },
    ]);

    return true;
  };

  const updateEpic = (epicName: string, newData: EpicData): boolean => {
    if (!epics) return false;

    if (epicName !== newData.name && epics.find((epic) => epic.name === newData.name)) {
      showToast({
        title: "Epic with this name already exists",
        style: Toast.Style.Failure,
      });
      return false;
    }

    setEpics(
      epics.map((epic) => {
        if (epic.name === epicName) {
          return newData;
        }
        return epic;
      }),
    );

    return true;
  };

  const updateLastUsedTimestamp = (epicName: string, timestamp?: number) => {
    if (!epics) return;
    setEpics(
      epics.map((epic) => {
        if (epic.name === epicName) {
          return {
            ...epic,
            lastUsedTimestamp: timestamp || Date.now(),
          };
        }
        return epic;
      }),
    );
  };

  const deleteEpic = (epicName: string) => {
    if (!epics) return;
    setEpics(epics.filter((epic) => epic.name !== epicName));
  };

  return {
    epics,
    deleteEpic,
    addEpic,
    updateLastUsedTimestamp,
    updateEpic,
  };
};
