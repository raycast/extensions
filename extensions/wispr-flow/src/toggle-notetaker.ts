import { runNotetakerCommand, toggleNotetaker } from "./notetaker";

export default async function main() {
  await runNotetakerCommand(toggleNotetaker);
}
