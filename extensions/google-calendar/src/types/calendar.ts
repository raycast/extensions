export type Calendar = {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  timeZone: string;
  colorId: string;
  backgroundColor: string;
  foregroundColor: string;
  selected: boolean;
  accessRole: string;
  defaultReminders: object;
  notificationSettings: object;
  primary: boolean;
  conferenceProperties: object;
};
