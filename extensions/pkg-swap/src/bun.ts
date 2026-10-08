import { convertCommand } from "./lib/converter";

export default async function command() {
  await convertCommand("npm", "bun");
}
