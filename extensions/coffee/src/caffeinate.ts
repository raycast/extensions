import { startCaffeinate } from "./utils";

export default async () => {
  await startCaffeinate(true, "Your Mac is now caffeinated");
};
