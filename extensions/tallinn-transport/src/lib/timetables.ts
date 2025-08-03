import { addMinutes, set } from "date-fns";

export type Workday = "Mon-Fri" | "Sat" | "Sun";

const WORKDAY_MAP = new Map<string, Workday>([
  ["12345", "Mon-Fri"],
  ["6", "Sat"],
  ["7", "Sun"],
]);

export type Timetable = {
  time: Date;
  workday: Workday;
  stopIndex: number;
};

export const getTimetables = (parts: string[]) => {
  const baseTimes: Timetable[] = [];

  let allPartsIndex = 0;
  let workdayIteratorIndex = 0;

  // Get timetable for first route
  for (allPartsIndex; allPartsIndex < parts.length; allPartsIndex += 1) {
    const part = parts[allPartsIndex];

    if (part === "") {
      break;
    }

    const minutes = +part;

    const previousTime =
      baseTimes[baseTimes.length - 1]?.time ?? set(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    const newTime = addMinutes(previousTime, minutes);

    baseTimes.push({ time: newTime, stopIndex: 0, workday: "Mon-Fri" });
  }

  // Fill initial timetable with workdays
  for (allPartsIndex += 5; allPartsIndex < parts.length; allPartsIndex += 2) {
    if (workdayIteratorIndex >= baseTimes.length) {
      break;
    }

    const workday = parts[allPartsIndex];
    const repetitions = +parts[allPartsIndex + 1] || baseTimes.length - workdayIteratorIndex;

    if (workday === "" || workday === "0") {
      continue;
    }

    for (let i = 0; i < repetitions; i += 1) {
      baseTimes[workdayIteratorIndex].workday = WORKDAY_MAP.get(workday) || "Mon-Fri";
      workdayIteratorIndex += 1;
    }
  }

  const allTimes = [...baseTimes];

  // Fill all other routes' timetables
  let remainingTimesIndex = baseTimes.length;
  let offset = 5;

  for (allPartsIndex; allPartsIndex < parts.length; allPartsIndex += 2) {
    offset += +parts[allPartsIndex] - 5;
    let repetitions = +parts[allPartsIndex + 1];

    if (repetitions > remainingTimesIndex || repetitions === 0) {
      repetitions = remainingTimesIndex;
      remainingTimesIndex = 0;
    } else {
      remainingTimesIndex -= repetitions;
    }

    for (let i = 0; i < repetitions; i += 1) {
      const pivotTime = allTimes[allTimes.length - baseTimes.length];

      allTimes.push({
        time: addMinutes(pivotTime.time, offset),
        stopIndex: pivotTime.stopIndex + 1,
        workday: pivotTime.workday,
      });
    }

    if (remainingTimesIndex <= 0) {
      remainingTimesIndex = baseTimes.length;
      offset = 5;
    }
  }

  return allTimes;
};

export const getWorkdayType = (date = new Date()) => {
  const day = date.getDay();
  if (day >= 1 && day <= 5) return "Mon-Fri";
  if (day === 6) return "Sat";
  return "Sun";
};
