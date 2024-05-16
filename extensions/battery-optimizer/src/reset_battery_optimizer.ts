import { setBatteryThreshold } from "./utils";

export default async () => {
  await setBatteryThreshold(100, "🔋charging threshold：");
};
