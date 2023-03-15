import { stopCaffeinate } from "./utils";

export default async () => {
  await stopCaffeinate(true, "Your Mac is now decaffeinated");
};
