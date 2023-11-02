import { useEffect, useState } from "react";
import { LocalStorage, Toast, showToast } from "@raycast/api";
import { t } from "i18next";
import { loadSavedData } from "../utils";

import type { EpicData } from "../types";
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

  const addEpic = (newEpicName: string) => {
    if (epics === undefined) return;
    const [name_, ...description_] = newEpicName.split("/");
    const name = name_.trim();
    const description = description_.join("/").trim();

    if (epics.find((epic) => epic.name === name)) {
      showToast({
        title: t("Epic with this name already exists"),
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!name) {
      showToast({
        title: t("Empty epic name"),
        style: Toast.Style.Failure,
      });
      return;
    }
    setEpics([
      ...epics,
      {
        name,
        addedTimestamp: Date.now(),
        description,
      },
    ]);
  };

  const updateEpic = (epicName: string, query: string) => {
    if (!epics) return;

    if (epics === undefined) return;
    const [, ...description_] = query.split("/");
    const description = description_.join("/").trim();

    setEpics(
      epics.map((epic) => {
        if (epic.name === epicName) {
          return {
            ...epic,
            description,
          };
        }
        return epic;
      }),
    );
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
