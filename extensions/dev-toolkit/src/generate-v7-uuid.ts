import { v7 as uuidv7 } from "uuid";
import { produceOutput } from "./utils";

export default async function Command() {
  const uuid = uuidv7();
  await produceOutput(uuid);
}
