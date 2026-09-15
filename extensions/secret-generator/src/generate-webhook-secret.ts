import { generateAndDeliver } from "./generator";

export default async function command() {
  await generateAndDeliver(32, "webhook secret");
}
