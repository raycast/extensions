import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCronJobCommand() {
  await launchAnvilURL("anvil://tool/cron-job");
}
