import { v4 as uuidv4 } from "uuid";
import { produceOutput } from "./utils";

export default async function Command() {
  const uuid = uuidv4();
  await produceOutput(uuid);
}
