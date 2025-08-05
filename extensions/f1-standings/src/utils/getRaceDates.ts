import { Race } from "../types";

const getRaceDates = (race: Race) => {
  const parts: [string, Date][] = [];

  if (race.date && race.time) {
    parts.push(["Race", new Date(race.date + "T" + race.time)]);
  }
  if (race.FirstPractice && race.FirstPractice.date && race.FirstPractice.time) {
    parts.push(["First Practice", new Date(race.FirstPractice.date + "T" + race.FirstPractice.time)]);
  }
  if (race.SecondPractice && race.SecondPractice.date && race.SecondPractice.time) {
    parts.push(["Second Practice", new Date(race.SecondPractice.date + "T" + race.SecondPractice.time)]);
  }
  if (race.ThirdPractice && race.ThirdPractice.date && race.ThirdPractice.time) {
    parts.push(["Third Practice", new Date(race.ThirdPractice.date + "T" + race.ThirdPractice.time)]);
  }
  if (race.Qualifying && race.Qualifying.date && race.Qualifying.time) {
    parts.push(["Qualifying", new Date(race.Qualifying.date + "T" + race.Qualifying.time)]);
  }
  if (race.SprintQualifying && race.SprintQualifying.date && race.SprintQualifying.time) {
    parts.push(["Sprint Qualifying", new Date(race.SprintQualifying.date + "T" + race.SprintQualifying.time)]);
  }
  if (race.Sprint && race.Sprint.date && race.Sprint.time) {
    parts.push(["Sprint", new Date(race.Sprint.date + "T" + race.Sprint.time)]);
  }
  parts.sort(([_, a], [__, b]) => {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  });

  return parts;
};

export default getRaceDates;
