import { convertCommand } from "./lib/converter";

export default async function command() {
  try {
    await convertCommand("npm", "yarn");
  } catch (error) {
    console.error(error);
    throw error;
  }
}
