import { LocalStorage, LaunchProps, updateCommandMetadata } from "@raycast/api";
import { Schedule, startCaffeinate, calculateDurationInSeconds, dayStringToNumber, numberToDayString } from "./utils";
import { execSync } from "node:child_process";
import { TLSSocket } from "node:tls";

function isCaffeinateRunning(): boolean {
  try {
    execSync("pgrep caffeinate");
    return true;
  } catch {
    return false;
  }
}


// TODO(Aditi): Figure out why checkpoint 2 and 3 are not being printed, that is why is the code not working?

async function handleScheduledCaffeinate(schedule: Schedule, currentDate: Date, currentDayString:string): Promise<boolean> {
  if (!schedule || Object.keys(schedule).length === 0) {
    console.log("checkpoint a");
    return false;
  }

  const [startHour, startMinute] = schedule.from.split(':').map(Number);
  const [endHour, endMinute] = schedule.to.split(':').map(Number);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  if (currentDayString === schedule.day) {
    console.log("checkpoint 2");
    const isWithinSchedule =
      (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
      (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute));

    if (isWithinSchedule) {
      console.log("checkpoint 3");
      const duration = calculateDurationInSeconds(startHour, startMinute, endHour, endMinute);
      await startCaffeinate(
        { menubar: true, status: true },
        `Scheduled caffeination until ${schedule.to}`,
        `-t ${duration}`
      );
      return true;
    }
  }

  return false;
}

export default async function Command(props: LaunchProps) {
  const isCaffeinated: boolean = props.launchContext?.caffeinated ?? isCaffeinateRunning();
  let subtitle = "✖ Decaffeinated";

  if (isCaffeinated) {
    subtitle = "✔ Caffeinated";
  } else {
    const currentDate = new Date();
    const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
    const schedule: Schedule = JSON.parse((await LocalStorage.getItem(currentDayString)) || '{}');

    if (!schedule.IsManuallyDecafed) {
      console.log("checkpoint 1");
      const isScheduled = await handleScheduledCaffeinate(schedule, currentDate, currentDayString);
      if (isScheduled) {
        subtitle = "✔ Caffeinated";
      }
    }
  }

  updateCommandMetadata({ subtitle });
}
