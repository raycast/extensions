export enum ExpirationTime {
  Minute = 60 * 1000,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

export const isCacheExpired = (time: number, limit = ExpirationTime.Minute) => {
  return Date.now() - time > limit;
};
