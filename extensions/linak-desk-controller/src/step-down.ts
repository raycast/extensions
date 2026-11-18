import { nudge } from "./desk";

export default async function stepDown() {
  await nudge(-1);
}
