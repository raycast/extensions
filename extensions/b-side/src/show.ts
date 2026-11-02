import { send } from "./bside";

export default async function Command() {
  await send("show", "");
}
