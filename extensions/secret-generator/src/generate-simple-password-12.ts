import { generateAndDeliver } from "./generator";

export default async function command() {
  await generateAndDeliver(12, "simple password");
}
