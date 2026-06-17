import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";

export default async function Command() {
  let counter = 0;
  await LocalStorage.setItem("counter", counter);

  try {
    await launchCommand({ name: "decrement-counter", type: LaunchType.Background, context: { noUpdate: true } });
  } catch (error) {
    console.log(error);
  }

  try {
    await launchCommand({ name: "increment-counter", type: LaunchType.Background, context: { noUpdate: true } });
  } catch (error) {
    console.log(error);
  }
}
