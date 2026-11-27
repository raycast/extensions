import { runOnSelection } from "./cleanshotz";

export default async function Command() {
  await runOnSelection("open-annotate");
}
