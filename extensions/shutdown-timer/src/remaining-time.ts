import { LocalStorage, updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const storedEnd = await LocalStorage.getItem<number>("timerEnd");

  if (!storedEnd) {
    await updateCommandMetadata({ subtitle: `No active timer.` });
    return;
  }

  const timeLeft = storedEnd - Date.now(); // unix number

  if (timeLeft > 60000) {
    const value = Math.ceil(timeLeft / 60000);
    await updateCommandMetadata({ subtitle: `${value} minutes remaining` });
  } else if (timeLeft > 0) {
    const value = Math.ceil(timeLeft / 1000);
    await updateCommandMetadata({ subtitle: `${value} seconds remaining` });
  } else {
    await updateCommandMetadata({ subtitle: `No active timer.` });
    await LocalStorage.removeItem("timerEnd");
    await LocalStorage.removeItem("pid");
  }
}
