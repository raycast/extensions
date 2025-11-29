export interface Preferences {
  apiKey: string;
  companyDomain: string;
  employeeId: string;
  warnNoBreakAfterHours?: string;
  warnDailyHours?: string;
  defaultPauseDuration?: string;
  splitMode?: "afterMaxHours" | "customTimes";
  maxWorkHours?: string;
  customSplitEndTime?: string;
  customSplitStartTime?: string;
  includeWeekends?: boolean;
}
