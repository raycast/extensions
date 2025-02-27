import { v6 as uuidv6 } from "uuid";
import { produceOutput } from "./utils";

export default async function Command() {
  const uuid = uuidv6();
  await produceOutput(uuid);
}
