import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import { cache } from "./cache";
import { BASE_URL, getPersonioToken } from "./api";
import { daysInMonth, hoursBetween } from "../utils/date";

/**
 * An interface that matches the JSON output of the personio API for /company/attendances
 */
interface AttendancePeriodJSON {
  id: number;
  type: string;
  attributes: {
    employee: number;
    date: string;
    start_time: string;
    end_time: string;
    break: number;
    comment: string;
    updated_at: string;
    status: string;
    project: number;
    is_holiday: boolean;
    is_on_time_off: boolean;
  };
}

/**
 * A flattened version of the AttendancePeriodJSON interface
 */
export interface AttendancePeriod {
  id: number;
  employee: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  break: number;
  comment: string;
  updated_at: string;
  status: string;
  project: number;
  is_holiday: boolean;
  is_on_time_off: boolean;
}

/**
 * This function filters an array of AttendancePeriod objects to only
 * the unique dates.
 * @param arr List of AttendancePeriod objects
 * @returns List of AttendancePeriods with unique dates
 */
export function uniqueDateFilter(arr: AttendancePeriod[]) {
  // use a set to check for uniquness
  const dateSet = new Set<string>();

  return arr.filter((obj) => {
    if (dateSet.has(obj.date)) {
      return false;
    } else {
      dateSet.add(obj.date);
      return true;
    }
  });
}

/**
 * A function that calls the personio API to retrieve a list of AttendancePeriod objects.
 * @param employeeNumber To find the right attendances
 * @param token Personio API token to authenticate
 * @param currentYear Year for which to get the attendances for
 * @param selectedMonth Month for which to get the attendances for (for currentYear)
 * @returns A list of AttendancePeriod objects of currentYear - selectedMonth - employeeNumber
 */
export async function getAttendancesAPI(
  employeeNumber: number,
  token: string,
  currentYear: string,
  selectedMonth: string,
): Promise<AttendancePeriod[]> {
  // use the maximum days of the month to get the last day of it for filtering to the entire month
  const maxDays = daysInMonth(parseInt(currentYear), parseInt(selectedMonth));

  const url =
    BASE_URL +
    "/company/attendances?employees[]=" +
    employeeNumber +
    `&start_date=${currentYear}-${selectedMonth}-01&end_date=${currentYear}-${selectedMonth}-${maxDays}&includePending=true`;
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  try {
    const res = await axios.get(url, { headers });
    const data = res.data.data as AttendancePeriodJSON[];
    const attendances = data.map((a) => ({
      id: a.id,
      employee: a.attributes.employee,
      date: a.attributes.date,
      start_time: a.attributes.start_time,
      end_time: a.attributes.end_time,
      duration: hoursBetween(a.attributes.end_time, a.attributes.start_time),
      break: a.attributes.break,
      comment: a.attributes.comment,
      updated_at: a.attributes.updated_at,
      status: a.attributes.status,
      project: a.attributes.project,
      is_holiday: a.attributes.is_holiday,
      is_on_time_off: a.attributes.is_on_time_off,
    }));
    await showToast({
      title: "Loaded Attendances",
      message: `${attendances.length} Attendances in ${selectedMonth}/${currentYear} loaded successfully!`,
    });
    return attendances;
  } catch (error) {
    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "That didn't work!",
      message: "Attendances couldn't be fetched.",
    });
    return [];
  }
}

/**
 * This is a wrapper-function that implements caching for the AttendancePeriod objects.
 * Currently, attendances are cached for 30min
 * @param employeeNumber To find the right attendances
 * @param token Personio API token to authenticate
 * @param currentYear Year for which to get the attendances for
 * @param selectedMonth Month for which to get the attendances for (for currentYear)
 * @returns A list of AttendancePeriod objects of currentYear - selectedMonth - employeeNumber
 */
export async function getAttendances(employeeNumber: number, currentYear: string, selectedMonth: string) {
  const token = await getPersonioToken();
  const key = employeeNumber.toString() + currentYear + selectedMonth;
  const attendances = cache.get(key);

  if (attendances) {
    return JSON.parse(attendances) as AttendancePeriod[];
  } else {
    const attendances = await getAttendancesAPI(employeeNumber, token, currentYear, selectedMonth);
    cache.set(key, JSON.stringify(attendances), 30);
    return attendances;
  }
}
