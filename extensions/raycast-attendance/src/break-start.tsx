import { recordAndNotify } from "./clock-in";

export default async function Command() {
  await recordAndNotify("break-start");
}
