import { getChargeThreshold } from "./utils";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    await getChargeThreshold("🔋 Charging threshold: ");
  } catch (error) {
    await showFailureToast(error, { title: "Could not get charge threshold" });
  }
};
