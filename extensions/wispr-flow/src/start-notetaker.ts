import { runNotetakerCommand, startNotetaker } from "./notetaker";

export default async function main() {
  await runNotetakerCommand(startNotetaker);
}
