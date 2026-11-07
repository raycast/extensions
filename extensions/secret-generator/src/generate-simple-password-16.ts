import { generateAndDeliver } from "./generator";

export default async function command() {
  await generateAndDeliver(16, "simple password");
}
