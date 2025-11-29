export const BASE_URL = "https://{companyDomain}.bamboohr.com/api/v1";

export enum BambooHREndpoint {
  TimeTracking = "time_tracking/employees/{employeeId}/{action}",
  TimesheetEntries = "time_tracking/timesheet_entries",
  ClockEntries = "time_tracking/clock_entries/store",
  ClockEntriesDelete = "time_tracking/clock_entries/delete",
  Projects = "time_tracking/projects",
  EmployeeProjects = "time_tracking/employees/{employeeId}/projects",
  WhosOut = "time_off/whos_out",
}

export enum TimeTrackingAction {
  ClockIn = "clock_in",
  ClockOut = "clock_out",
}

export function buildBaseUrl(companyDomain: string): string {
  return BASE_URL.replace("{companyDomain}", companyDomain);
}

export function buildUrl(
  companyDomain: string,
  endpoint: BambooHREndpoint,
  params: Record<string, string>,
): string {
  let url = `${buildBaseUrl(companyDomain)}/${endpoint}`;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, value);
  }
  return url;
}
