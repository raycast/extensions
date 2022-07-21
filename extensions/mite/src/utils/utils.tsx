import { closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { MiteEntry } from "../model/MiteEntry";
import { createTimeEntry, startTracker } from "./api";

export const createMiteEntry = (projectId: number, serviceId: number, note: string) => {
  console.log({
    projectId,
    serviceId,
    note: note,
  });

  createTimeEntry(projectId, serviceId, note)
    .then((response) => {
      const timeEntryId = response.data.time_entry.id;

      startTracker(timeEntryId)
        .then(() => {
          showMessageAndQuit("Time entry created & started");
        })
        .catch((error) => {
          showHUD("Error starting time entry: " + error.message);
        });
    })
    .catch((err) => {
      showHUD("Error creating time entry: " + err.message);
    });
};

export const showMessageAndQuit = (message: string) => {
  closeMainWindow();
  popToRoot();
  showHUD(message);
};
export const getEntryFrequencies = (miteEntries: MiteEntry[]) => {
  const entryFrequencies: { miteEntry: MiteEntry; occurrence: number }[] = [];

  miteEntries.forEach((x) => {
    // check if there is any object which contains the note
    if (
      entryFrequencies.some((val) => {
        return val.miteEntry.note === x.note;
      })
    ) {
      // if yes, increase occurrence for each note found
      entryFrequencies.forEach((k) => {
        if (k.miteEntry.note === x.note) {
          k["occurrence"]++;
        }
      });
    } else {
      // if no, create a new object with the note and occurrence 1
      entryFrequencies.push({ miteEntry: x, occurrence: 1 });
    }
  });

  // sort the array by occurrence (descending)
  entryFrequencies.sort((a, b) => {
    return b.occurrence - a.occurrence;
  });

  return entryFrequencies;
};

export const getTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m);
};
