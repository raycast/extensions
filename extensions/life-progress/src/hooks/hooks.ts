import { useCallback, useEffect, useState } from "react";
import { Alert, confirmAlert, Icon, LocalStorage } from "@raycast/api";
import { CountdownDate, LifeProgressType } from "../types/types";
import { getLifeProgress } from "../utils/life-progress-utils";
import { LocalStorageKey } from "../utils/constants";
import { updateCommandSubtitle } from "../utils/common-utils";

export const getLifeProgressInfo = (refresh: number) => {
  const [lifeProgresses, setLifeProgresses] = useState<LifeProgressType[]>([]);
  const [countdownDates, setCountdownDates] = useState<CountdownDate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.COUNTDOWN_DATE_KEY);
    const localCountdownDates: CountdownDate[] = typeof localStorage !== "undefined" ? JSON.parse(localStorage) : [];
    const { lifeProgresses } = getLifeProgress(localCountdownDates);

    setLifeProgresses(lifeProgresses);
    setCountdownDates(localCountdownDates);
    setLoading(false);
    await updateCommandSubtitle();
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { lifeProgresses: lifeProgresses, countDownDates: countdownDates, loading: loading };
};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void,
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
