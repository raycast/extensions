import { addDays } from "date-fns";
import { CustomProgressId, Progress, ProgressFormErrors, ProgressFormValues } from "../types";

export function createProgressFormValues(progress?: Progress, now = new Date()): ProgressFormValues {
  if (progress) {
    return {
      title: progress.title,
      menubarTitle: progress.menubar.title,
      startDate: new Date(progress.startDate),
      endDate: new Date(progress.endDate),
      showInMenubar: progress.menubar.shown,
      showAsCommand: progress.showAsCommand,
    };
  }
  return {
    title: "",
    menubarTitle: "",
    startDate: new Date(now.getTime()),
    endDate: addDays(now, 1),
    showInMenubar: false,
    showAsCommand: false,
  };
}

export function validateProgressForm(
  values: ProgressFormValues,
  allProgress: readonly Progress[],
  editingId?: CustomProgressId
): ProgressFormErrors {
  const errors: ProgressFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Enter a progress title.";
  else if (allProgress.some((progress) => progress.id !== editingId && progress.title.trim() === title)) {
    errors.title = "A progress with this title already exists.";
  }
  if (!values.menubarTitle.trim()) errors.menubarTitle = "Enter a progress label.";

  const startTime = values.startDate instanceof Date ? values.startDate.getTime() : NaN;
  const endTime = values.endDate instanceof Date ? values.endDate.getTime() : NaN;
  if (!Number.isFinite(startTime)) errors.startDate = "Choose a valid start date.";
  if (!Number.isFinite(endTime)) errors.endDate = "Choose a valid end date.";
  else if (Number.isFinite(startTime) && endTime <= startTime) {
    errors.endDate = "The end date must be later than the start date.";
  }
  return errors;
}
