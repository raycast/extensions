import { nudgeRate } from "./lib/rate.js";

export default async function SpeedDown() {
  await nudgeRate(-1);
}
