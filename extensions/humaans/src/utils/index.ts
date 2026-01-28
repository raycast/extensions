import startCase from "lodash/startCase";
import { Person, JobRole } from "../types";

export const getFullName = (firstName: string, lastName: string) => {
  return startCase(`${firstName || ""} ${lastName || ""}`);
};

export const getSuffix = (day: number) => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const getPerson = (people: Person[], personId: string): Person => {
  return people.find((person) => person.id === personId) ?? ({} as Person);
};

export const getJobRole = (jobRoles: JobRole[], personId: string): JobRole => {
  return jobRoles.find((jobRole) => jobRole.personId === personId) ?? ({} as JobRole);
};
