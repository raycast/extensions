import { generateAndDeliver } from "./generator";

export default async function command() {
  await generateAndDeliver(8, "simple password");
}
