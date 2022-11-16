export type Preferences = {
  apiToken: string;
};

export type Tag = {
  id: number;
  key: string;
  label: string;
  scope: string;
  spaceId: string;
};

export type Mention = {
  id: number;
  key: string;
  label: string;
  scope: string;
  spaceId: string;
};

export type Note = {
  text: string;
  tags: Tag[];
  mentions: Mention[];
};

export type Tracking = {
  id: number;
  activityId: string;
  startedAt: string;
  note: Note;
};

export type Activity = {
  id: string;
  name: string;
  color: string;
  integration: string;
  spaceId: string;
};

export type Duration = {
  startedAt: string;
  stoppedAt: string;
};

export type TimeEntry = {
  id: string;
  creator: string;
  activity: Activity;
  duration: Duration;
  note: Note;
};

export type ActivityReport = {
  activity: Activity;
  duration: number;
};
