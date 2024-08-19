import { LocalStorage, LaunchProps, updateCommandMetadata } from "@raycast/api";
import { Schedule, startCaffeinate, calculateDurationInSeconds, numberToDayString } from "./utils";
import { execSync } from "node:child_process";

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
    return false;
  }

  const [startHour, startMinute] = schedule.from.split(':').map(Number);
  const [endHour, endMinute] = schedule.to.split(':').map(Number);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  if (currentDayString === schedule.day) {
    const isWithinSchedule =
      (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
      (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute));

    if(isWithinSchedule === false){
      schedule.IsRunning = false;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule)); 
      return false;
    }

    if (schedule.IsRunning === false) {
      const duration = calculateDurationInSeconds(startHour, startMinute, endHour, endMinute);
      await startCaffeinate(
        { menubar: true, status: true },
        `Scheduled caffeination until ${schedule.to}`,
        `-t ${duration}`
      );
      schedule.IsRunning = true;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule)); 
      return true;
    } 
  }

  return true;
}

export async function checkSchedule(){
  console.log("checkpoint 1");
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
  const schedule: Schedule = JSON.parse((await LocalStorage.getItem(currentDayString)) || '{}');

  if (!schedule.IsManuallyDecafed) {
    const isScheduled = await handleScheduledCaffeinate(schedule, currentDate, currentDayString);
    return isScheduled;
  }

  return false;
}

export default async function Command(props: LaunchProps) {
  const isCaffeinated: boolean = props.launchContext?.caffeinated ?? isCaffeinateRunning();
  let subtitle = isCaffeinated? "✔ Caffeinated":"✖ Decaffeinated";
  subtitle = await checkSchedule() ? "✔ Caffeinated" : "✖ Decaffeinated";

  updateCommandMetadata({ subtitle });
}
