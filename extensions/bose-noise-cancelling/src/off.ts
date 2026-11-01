import { setLevel } from "./boseAnc";

export default async function Command() {
  await setLevel("off");
}
