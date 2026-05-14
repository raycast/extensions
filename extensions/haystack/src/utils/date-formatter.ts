import { DATE_FORMATS } from "../constants";

export const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString("en-US", DATE_FORMATS.DISPLAY);
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
