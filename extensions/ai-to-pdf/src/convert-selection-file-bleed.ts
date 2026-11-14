import { convertFinderSelection } from "./lib/finder-command";

export default async function Command() {
  await convertFinderSelection({ mode: "file" });
}
