import { LocalStorage } from "@raycast/api";
import { CURRENT_EPIC_STORAGE_KEY, EPICS_STORAGE_KEY } from "./consts";
import { EpicData, InProgressEpicData } from "./types";

export const generateCalendarURL = ({
  title,
  startDate,
  endDate,
  templateEventUrl,
}: {
  title: string;
  startDate: number;
  endDate: number;
  templateEventUrl?: string;
}) => {
  const base = templateEventUrl || "https://www.google.com/calendar/render?action=TEMPLATE";
  // return BASE64 encoded string. Dates are in the RFC 5545 format
  const startDateString = new Date(startDate).toISOString().replace(/[-:.]/g, "");
  const endDateString = new Date(endDate).toISOString().replace(/[-:.]/g, "");
  return `${base}&text=${encodeURIComponent(title)}&dates=${startDateString}/${endDateString}`;
};

export const loadSavedData = async () => {
  const epicsPromise = LocalStorage.getItem(EPICS_STORAGE_KEY).then((epics) => {
    if (epics && typeof epics === "string") {
      return JSON.parse(epics) as EpicData[];
    }
    return [];
  });
  const workingOnEpicPromise = LocalStorage.getItem(CURRENT_EPIC_STORAGE_KEY).then((epicData) => {
    if (epicData && typeof epicData === "string") {
      return JSON.parse(epicData) as InProgressEpicData;
    }
    return null;
  });

  const [epics, workingOnEpicData] = await Promise.all([epicsPromise, workingOnEpicPromise]);

  return {
    epics,
    workingOnEpicData,
  };
};
