export const RAYCAST_SUFFIX = "-by-Raycast";

export const getOriginalNoteName = (savedName: string) => {
  return savedName.replace(RAYCAST_SUFFIX, "");
};

export const getUniqueNameForDoc = (docName: string) => {
  return docName + RAYCAST_SUFFIX;
};

const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false, // Use 24-hour format
};

export function getDateInLocaleFormat() {
  return new Date().toLocaleString(undefined, options);
}
