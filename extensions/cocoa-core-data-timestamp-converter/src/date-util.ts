export function convertCocoaCoreDataDateToEpoch(coreDataDateNumber: number): number {
  return Math.floor((coreDataDateNumber + 978307200) * 1000);
}
export function convertEpochToCocoaCoreDataNumber(epochDate: number): number {
  return Math.floor(epochDate / 1000) - 978307200;
}
export function convertCocoaCoreDataDateToDate(coreDataDateNumber: number): Date {
  return new Date(convertCocoaCoreDataDateToEpoch(coreDataDateNumber));
}
