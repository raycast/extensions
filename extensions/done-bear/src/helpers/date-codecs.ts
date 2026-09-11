export const dateOnlyEpochFromLocalDate = (value: Date): number =>
  Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());

export const localDateFromDateOnlyEpoch = (epoch: number | undefined): Date | undefined => {
  if (epoch === undefined) {
    return undefined;
  }
  const date = new Date(epoch);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const instantEpochFromDate = (value: Date): number => value.getTime();

export const todayDateOnlyEpoch = (now = new Date()): number => dateOnlyEpochFromLocalDate(now);

export const tomorrowDateOnlyEpoch = (now = new Date()): number =>
  Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1);
