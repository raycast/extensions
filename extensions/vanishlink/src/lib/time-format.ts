import { TIME_CONSTANTS } from "./constants";
import { getRemainingMilisecond } from "./utils";

export const formatRemainingTime = (timestamp: number): string => {
  const { millisecond } = getRemainingMilisecond(timestamp);

  if (millisecond <= 0) {
    return "Expired";
  }

  const minutes = Math.floor((millisecond % TIME_CONSTANTS.ONE_HOUR_MS) / TIME_CONSTANTS.ONE_MINUTE_MS);
  const hours = Math.floor((millisecond % TIME_CONSTANTS.ONE_DAY_MS) / TIME_CONSTANTS.ONE_HOUR_MS);
  const days = Math.floor(millisecond / TIME_CONSTANTS.ONE_DAY_MS);

  if (millisecond < TIME_CONSTANTS.ONE_HOUR_MS) {
    return `${minutes}m left`;
  }

  if (millisecond < TIME_CONSTANTS.ONE_DAY_MS) {
    return `${hours}h ${minutes}m left`;
  }

  return `${days}d ${hours}h left`;
};
