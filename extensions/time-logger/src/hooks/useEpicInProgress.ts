import { useEffect, useState } from "react";
import { loadSavedData } from "../utils";
import { Alert, LocalStorage, confirmAlert } from "@raycast/api";

import type { InProgressEpicData } from "../types";
import { CURRENT_EPIC_STORAGE_KEY } from "../consts";

export const useEpicInProgress = (updateLastUsedTimestamp: (epicName: string) => void) => {
  const [workingOnEpicData, setWorkingOnEpicData] = useState<InProgressEpicData | null | undefined>(undefined);

  useEffect(() => {
    loadSavedData().then(({ workingOnEpicData }) => {
      setWorkingOnEpicData(workingOnEpicData);
    });
  }, []);

  useEffect(() => {
    if (workingOnEpicData === undefined) return;
    if (workingOnEpicData === null) {
      LocalStorage.removeItem(CURRENT_EPIC_STORAGE_KEY);
    } else {
      LocalStorage.setItem(CURRENT_EPIC_STORAGE_KEY, JSON.stringify(workingOnEpicData));
    }
  }, [JSON.stringify(workingOnEpicData)]);

  const _startWorkingOnEpic = (epicName: string) => {
    setWorkingOnEpicData({
      name: epicName,
      workStartedTimestamp: Date.now(),
    });
    updateLastUsedTimestamp(epicName);
  };

  const startWork = (epicName: string) => {
    const hasUnfinishedWork = workingOnEpicData && workingOnEpicData?.name !== epicName;
    const discardAndStartWork = () => _startWorkingOnEpic(epicName);
    const showDiscardConfirmation = () =>
      confirmAlert({
        title: "Discard ongoing work?",
        primaryAction: {
          title: "Discard",
          style: Alert.ActionStyle.Destructive,
          onAction: discardAndStartWork,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

    if (hasUnfinishedWork) {
      showDiscardConfirmation();
    } else {
      _startWorkingOnEpic(epicName);
    }
  };

  const workStartedAt = workingOnEpicData?.workStartedTimestamp
    ? new Date(workingOnEpicData.workStartedTimestamp)
    : null;

  return {
    workingOnEpicData,
    setWorkingOnEpicData,
    startWork,
    workStartedAt,
  };
};
