import { v1 as uuidv1 } from "uuid";
import { produceOutput } from "./utils";

export default async function Command() {
  const uuid = uuidv1();
  await produceOutput(uuid);
}
