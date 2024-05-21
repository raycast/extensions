import { setBatteryThreshold } from "./utils";

export default async () => {
  await setBatteryThreshold(80, "🔋limit charging above：");
};
