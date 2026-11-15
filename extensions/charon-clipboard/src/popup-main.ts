import { popup } from "./lib/bridge";

export default async function Command() {
  await popup("main");
}
