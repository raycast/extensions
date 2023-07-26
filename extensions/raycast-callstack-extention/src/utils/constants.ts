// export const EMPLOYEES_DATABASE_ID = "2d93d0f805eb4868ac143d6a0126e343";
// export const OKRS_DATABASE_ID = "8a1969746d7b47ca955fe5df269decb0";
// export const DEVS_DATABASE_ID = "2f2801446f7a448985280df79b0116de";
// export const INTERVIEW_NOTES_DATABASE_ID = "ce4ace7dba094bb2936b9ea8871e5ca4";
// export const NOTES_DATABASE_ID = "6d92436a4bfe434ab2dbe6f037ae950d";

export const RECRUITEE_URL = "https://api.recruitee.com/c/7305";

export enum EmployeesDbFields {
  name = "Surname / Name",
  seniority = "Role / Seniority Level",
  domain = "Domain",
  hrbp = "HRBP",
  country = "Country/City",
}

export enum OKRsDbFields {
  name = "Name",
  competencyMap = "Competency map",
  developer = "Developer",
  startDate = "Start Date",
}

export enum DevsDbFields {
  name = "Name",
  startDate = "Start date",
  probationEndDate = "Probation end date",
}

export enum InterviewNotesDbFields {
  name = "Name",
}

export enum NotesDbFields {
  name = "Title",
  relatedDeveloper = "Related dev",
  date = "Date",
}

export const roleToColorMap: { [key: string]: string } = {
  ["Mid 2"]: "#e3242b",
  ["Senior 1"]: "#0492c2",
  ["Senior 2"]: "#3cb043",
  ["Expert"]: "#fcae1e",
};

export function mapRoleToColor(role: string): string {
  return roleToColorMap[role] || "#ff1694";
}
