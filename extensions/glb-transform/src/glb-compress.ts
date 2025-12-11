import { processGlbFiles } from "./utils";

export default async function Command() {
  await processGlbFiles("full", "Draco + KTX");
}
