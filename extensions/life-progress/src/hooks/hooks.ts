import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { buildShanBayURL, ShanBeiResponseData, WordOfTheDay } from "../utils/shanbei-utils";
import { Alert, confirmAlert, getPreferenceValues, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { CountdownDate, LifeProgress } from "../types/types";
import { getLifeProgress } from "../utils/life-progress-utils";
import { LocalStorageKey } from "../utils/constants";
import { updateCommandSubtitle } from "../utils/common-utils";
import { Preferences } from "../types/preferences";

export const getWordOfTheDay = () => {
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay>({
    content: "",
    author: "",
    translation: "",
  });
  const fetchData = useCallback(async () => {
    const { showDailyWord } = getPreferenceValues<Preferences>();
    if (!showDailyWord) {
      return;
    }
    try {
      fetch(buildShanBayURL())
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          const shanBeiResponseData = data as ShanBeiResponseData;
          setWordOfTheDay({
            content: shanBeiResponseData.content,
            author: shanBeiResponseData.author,
            translation: shanBeiResponseData.translation,
          });
        })
        .catch(async (e) => {
          if (e instanceof AbortError) {
            return;
          }
          await showToast(Toast.Style.Failure, String(e));
        });
    } catch (e) {
      if (e instanceof AbortError) {
        return;
      }
      await showToast(Toast.Style.Failure, String(e));
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { wordOfTheDay: wordOfTheDay };
};

export const getLifeProgressInfo = (refresh: number) => {
  const [lifeProgresses, setLifeProgresses] = useState<LifeProgress[]>([]);
  const [countdownDates, setCountdownDates] = useState<CountdownDate[]>([]);
  const [cakeIndex, setCakeIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.COUNTDOWN_DATE_KEY);
    const localCountdownDates: CountdownDate[] = typeof localStorage !== "undefined" ? JSON.parse(localStorage) : [];
    const { lifeProgresses, cakeIndex } = getLifeProgress(localCountdownDates);

    setLifeProgresses(lifeProgresses);
    setCountdownDates(localCountdownDates);
    setCakeIndex(cakeIndex);
    setLoading(false);
    await updateCommandSubtitle(lifeProgresses);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { lifeProgresses: lifeProgresses, countDownDates: countdownDates, cakeIndex: cakeIndex, loading: loading };
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
