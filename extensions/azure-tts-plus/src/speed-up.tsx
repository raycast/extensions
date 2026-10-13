import { nudgeRate } from "./lib/rate.js";

export default async function SpeedUp() {
  await nudgeRate(1);
}
