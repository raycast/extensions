import { runNotetakerCommand, stopNotetaker } from "./notetaker";

export default async function main() {
  await runNotetakerCommand(stopNotetaker);
}
