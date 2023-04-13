/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Time: string;
};

export type Cursor = {
  __typename?: "Cursor";
  hasMore: Scalars["Boolean"];
  offset: Scalars["Int"];
  pageSize: Scalars["Int"];
  startId: Scalars["Int"];
};

export type Dashboard = {
  __typename?: "Dashboard";
  id: Scalars["Int"];
  items: Array<DashboardEntry>;
  name: Scalars["String"];
  ranges: Array<NamedDateRange>;
};

export type DashboardEntry = {
  __typename?: "DashboardEntry";
  entryType: EntryType;
  id: Scalars["Int"];
  pos: ResponsiveDashboardEntryPos;
  statsSelection: StatsSelection;
  title: Scalars["String"];
};

export type DashboardEntryPos = {
  __typename?: "DashboardEntryPos";
  h: Scalars["Int"];
  minH: Scalars["Int"];
  minW: Scalars["Int"];
  w: Scalars["Int"];
  x: Scalars["Int"];
  y: Scalars["Int"];
};

export enum DashboardSize {
  Large = "Large",
  Medium = "Medium",
  Small = "Small",
}

export enum DateLocale {
  American = "American",
  American24h = "American24h",
  Australian = "Australian",
  British = "British",
  German = "German",
}

export type Device = {
  __typename?: "Device";
  activeAt: Scalars["Time"];
  createdAt: Scalars["Time"];
  id: Scalars["Int"];
  name: Scalars["String"];
  type: DeviceType;
};

export enum DeviceType {
  LongExpiry = "LongExpiry",
  NoExpiry = "NoExpiry",
  ShortExpiry = "ShortExpiry",
}

export enum EntryType {
  BarChart = "BarChart",
  HorizontalTable = "HorizontalTable",
  LineChart = "LineChart",
  PieChart = "PieChart",
  StackedBarChart = "StackedBarChart",
  VerticalTable = "VerticalTable",
}

export type InputCursor = {
  offset?: InputMaybe<Scalars["Int"]>;
  pageSize?: InputMaybe<Scalars["Int"]>;
  startId?: InputMaybe<Scalars["Int"]>;
};

export type InputDashboardEntryPos = {
  h: Scalars["Int"];
  w: Scalars["Int"];
  x: Scalars["Int"];
  y: Scalars["Int"];
};

export type InputNamedDateRange = {
  editable: Scalars["Boolean"];
  name: Scalars["String"];
  range: InputRelativeOrStaticRange;
};

export type InputRelativeOrStaticRange = {
  from: Scalars["String"];
  to: Scalars["String"];
};

export type InputReplaceOptions = {
  override: OverrideMode;
};

export type InputResponsiveDashboardEntryPos = {
  desktop?: InputMaybe<InputDashboardEntryPos>;
  mobile?: InputMaybe<InputDashboardEntryPos>;
};

export type InputStatsSelection = {
  excludeTags?: InputMaybe<Array<InputTimeSpanTag>>;
  includeTags?: InputMaybe<Array<InputTimeSpanTag>>;
  interval: StatsInterval;
  range?: InputMaybe<InputRelativeOrStaticRange>;
  rangeId?: InputMaybe<Scalars["Int"]>;
  tags?: InputMaybe<Array<Scalars["String"]>>;
};

export type InputTimeSpanTag = {
  key: Scalars["String"];
  value: Scalars["String"];
};

export type InputUserSettings = {
  dateLocale: DateLocale;
  firstDayOfTheWeek: WeekDay;
  theme: Theme;
};

export type Login = {
  __typename?: "Login";
  device: Device;
  token: Scalars["String"];
  user: User;
};

export type NamedDateRange = {
  __typename?: "NamedDateRange";
  editable: Scalars["Boolean"];
  id: Scalars["Int"];
  name: Scalars["String"];
  range: RelativeOrStaticRange;
};

export enum OverrideMode {
  Discard = "Discard",
  Override = "Override",
}

export type PagedTimeSpans = {
  __typename?: "PagedTimeSpans";
  cursor: Cursor;
  timeSpans: Array<TimeSpan>;
};

export type Range = {
  end: Scalars["Time"];
  start: Scalars["Time"];
};

export type RangedStatisticsEntries = {
  __typename?: "RangedStatisticsEntries";
  end: Scalars["Time"];
  entries?: Maybe<Array<StatisticsEntry>>;
  start: Scalars["Time"];
};

export type RelativeOrStaticRange = {
  __typename?: "RelativeOrStaticRange";
  from: Scalars["String"];
  to: Scalars["String"];
};

export type ResponsiveDashboardEntryPos = {
  __typename?: "ResponsiveDashboardEntryPos";
  desktop: DashboardEntryPos;
  mobile: DashboardEntryPos;
};

export enum Role {
  Admin = "ADMIN",
  User = "USER",
}

export type RootMutation = {
  __typename?: "RootMutation";
  addDashboardEntry?: Maybe<DashboardEntry>;
  addDashboardRange?: Maybe<NamedDateRange>;
  copyTimeSpan?: Maybe<TimeSpan>;
  createDashboard: Dashboard;
  createDevice?: Maybe<Login>;
  createTag?: Maybe<TagDefinition>;
  createTimeSpan?: Maybe<TimeSpan>;
  createUser?: Maybe<User>;
  login?: Maybe<Login>;
  removeCurrentDevice: Device;
  removeDashboard: Dashboard;
  removeDashboardEntry: DashboardEntry;
  removeDashboardRange?: Maybe<NamedDateRange>;
  removeDevice?: Maybe<Device>;
  removeTag?: Maybe<TagDefinition>;
  removeTimeSpan?: Maybe<TimeSpan>;
  removeUser?: Maybe<User>;
  replaceTimeSpanTags?: Maybe<Scalars["Boolean"]>;
  setUserSettings: UserSettings;
  stopTimeSpan?: Maybe<TimeSpan>;
  updateDashboard: Dashboard;
  updateDashboardEntry?: Maybe<DashboardEntry>;
  updateDashboardRange?: Maybe<NamedDateRange>;
  updateDevice?: Maybe<Device>;
  updateTag?: Maybe<TagDefinition>;
  updateTimeSpan?: Maybe<TimeSpan>;
  updateUser?: Maybe<User>;
};

export type RootMutationAddDashboardEntryArgs = {
  dashboardId: Scalars["Int"];
  entryType: EntryType;
  pos?: InputMaybe<InputResponsiveDashboardEntryPos>;
  stats: InputStatsSelection;
  title: Scalars["String"];
};

export type RootMutationAddDashboardRangeArgs = {
  dashboardId: Scalars["Int"];
  range: InputNamedDateRange;
};

export type RootMutationCopyTimeSpanArgs = {
  end?: InputMaybe<Scalars["Time"]>;
  id: Scalars["Int"];
  start: Scalars["Time"];
};

export type RootMutationCreateDashboardArgs = {
  name: Scalars["String"];
};

export type RootMutationCreateDeviceArgs = {
  name: Scalars["String"];
  type: DeviceType;
};

export type RootMutationCreateTagArgs = {
  color: Scalars["String"];
  key: Scalars["String"];
};

export type RootMutationCreateTimeSpanArgs = {
  end?: InputMaybe<Scalars["Time"]>;
  note: Scalars["String"];
  start: Scalars["Time"];
  tags?: InputMaybe<Array<InputTimeSpanTag>>;
};

export type RootMutationCreateUserArgs = {
  admin: Scalars["Boolean"];
  name: Scalars["String"];
  pass: Scalars["String"];
};

export type RootMutationLoginArgs = {
  cookie: Scalars["Boolean"];
  deviceName: Scalars["String"];
  pass: Scalars["String"];
  type: DeviceType;
  username: Scalars["String"];
};

export type RootMutationRemoveDashboardArgs = {
  id: Scalars["Int"];
};

export type RootMutationRemoveDashboardEntryArgs = {
  id: Scalars["Int"];
};

export type RootMutationRemoveDashboardRangeArgs = {
  rangeId: Scalars["Int"];
};

export type RootMutationRemoveDeviceArgs = {
  id: Scalars["Int"];
};

export type RootMutationRemoveTagArgs = {
  key: Scalars["String"];
};

export type RootMutationRemoveTimeSpanArgs = {
  id: Scalars["Int"];
};

export type RootMutationRemoveUserArgs = {
  id: Scalars["Int"];
};

export type RootMutationReplaceTimeSpanTagsArgs = {
  from: InputTimeSpanTag;
  opt: InputReplaceOptions;
  to: InputTimeSpanTag;
};

export type RootMutationSetUserSettingsArgs = {
  settings: InputUserSettings;
};

export type RootMutationStopTimeSpanArgs = {
  end: Scalars["Time"];
  id: Scalars["Int"];
};

export type RootMutationUpdateDashboardArgs = {
  id: Scalars["Int"];
  name: Scalars["String"];
};

export type RootMutationUpdateDashboardEntryArgs = {
  entryId: Scalars["Int"];
  entryType?: InputMaybe<EntryType>;
  pos?: InputMaybe<InputResponsiveDashboardEntryPos>;
  stats?: InputMaybe<InputStatsSelection>;
  title?: InputMaybe<Scalars["String"]>;
};

export type RootMutationUpdateDashboardRangeArgs = {
  range: InputNamedDateRange;
  rangeId: Scalars["Int"];
};

export type RootMutationUpdateDeviceArgs = {
  id: Scalars["Int"];
  name: Scalars["String"];
  type: DeviceType;
};

export type RootMutationUpdateTagArgs = {
  color: Scalars["String"];
  key: Scalars["String"];
  newKey?: InputMaybe<Scalars["String"]>;
};

export type RootMutationUpdateTimeSpanArgs = {
  end?: InputMaybe<Scalars["Time"]>;
  id: Scalars["Int"];
  note: Scalars["String"];
  oldStart?: InputMaybe<Scalars["Time"]>;
  start: Scalars["Time"];
  tags?: InputMaybe<Array<InputTimeSpanTag>>;
};

export type RootMutationUpdateUserArgs = {
  admin: Scalars["Boolean"];
  id: Scalars["Int"];
  name: Scalars["String"];
  pass?: InputMaybe<Scalars["String"]>;
};

export type RootQuery = {
  __typename?: "RootQuery";
  currentDevice?: Maybe<Device>;
  currentUser?: Maybe<User>;
  dashboards?: Maybe<Array<Dashboard>>;
  devices?: Maybe<Array<Device>>;
  stats?: Maybe<Array<RangedStatisticsEntries>>;
  stats2?: Maybe<Array<RangedStatisticsEntries>>;
  suggestTag?: Maybe<Array<TagDefinition>>;
  suggestTagValue?: Maybe<Array<Scalars["String"]>>;
  tags?: Maybe<Array<TagDefinition>>;
  timeSpans: PagedTimeSpans;
  timers?: Maybe<Array<TimeSpan>>;
  userSettings: UserSettings;
  users?: Maybe<Array<User>>;
  version: Version;
};

export type RootQueryStatsArgs = {
  excludeTags?: InputMaybe<Array<InputTimeSpanTag>>;
  ranges?: InputMaybe<Array<Range>>;
  requireTags?: InputMaybe<Array<InputTimeSpanTag>>;
  tags?: InputMaybe<Array<Scalars["String"]>>;
};

export type RootQueryStats2Args = {
  now: Scalars["Time"];
  stats: InputStatsSelection;
};

export type RootQuerySuggestTagArgs = {
  query: Scalars["String"];
};

export type RootQuerySuggestTagValueArgs = {
  key: Scalars["String"];
  query: Scalars["String"];
};

export type RootQueryTimeSpansArgs = {
  cursor?: InputMaybe<InputCursor>;
  fromInclusive?: InputMaybe<Scalars["Time"]>;
  toInclusive?: InputMaybe<Scalars["Time"]>;
};

export type StatInput = {
  key: Scalars["String"];
  mustHave?: InputMaybe<Array<InputTimeSpanTag>>;
  mustNotHave?: InputMaybe<Array<InputTimeSpanTag>>;
};

export type StatisticsEntry = {
  __typename?: "StatisticsEntry";
  key: Scalars["String"];
  timeSpendInSeconds: Scalars["Float"];
  value: Scalars["String"];
};

export enum StatsInterval {
  Daily = "Daily",
  Hourly = "Hourly",
  Monthly = "Monthly",
  Single = "Single",
  Weekly = "Weekly",
  Yearly = "Yearly",
}

export type StatsSelection = {
  __typename?: "StatsSelection";
  excludeTags?: Maybe<Array<TimeSpanTag>>;
  includeTags?: Maybe<Array<TimeSpanTag>>;
  interval: StatsInterval;
  range?: Maybe<RelativeOrStaticRange>;
  rangeId?: Maybe<Scalars["Int"]>;
  tags?: Maybe<Array<Scalars["String"]>>;
};

export type TagDefinition = {
  __typename?: "TagDefinition";
  color: Scalars["String"];
  key: Scalars["String"];
  usages: Scalars["Int"];
  user: User;
};

export enum Theme {
  GruvboxDark = "GruvboxDark",
  GruvboxLight = "GruvboxLight",
  MaterialDark = "MaterialDark",
  MaterialLight = "MaterialLight",
}

export type TimeSpan = {
  __typename?: "TimeSpan";
  end?: Maybe<Scalars["Time"]>;
  id: Scalars["Int"];
  note: Scalars["String"];
  oldStart?: Maybe<Scalars["Time"]>;
  start: Scalars["Time"];
  tags?: Maybe<Array<TimeSpanTag>>;
};

export type TimeSpanTag = {
  __typename?: "TimeSpanTag";
  key: Scalars["String"];
  value: Scalars["String"];
};

export type User = {
  __typename?: "User";
  admin: Scalars["Boolean"];
  id: Scalars["Int"];
  name: Scalars["String"];
};

export type UserSettings = {
  __typename?: "UserSettings";
  dateLocale: DateLocale;
  firstDayOfTheWeek: WeekDay;
  theme: Theme;
};

export type Version = {
  __typename?: "Version";
  buildDate: Scalars["String"];
  commit: Scalars["String"];
  name: Scalars["String"];
};

export enum WeekDay {
  Friday = "Friday",
  Monday = "Monday",
  Saturday = "Saturday",
  Sunday = "Sunday",
  Thursday = "Thursday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
}
