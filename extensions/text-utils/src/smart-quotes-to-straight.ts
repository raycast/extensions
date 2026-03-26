import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'),
    "Smart quotes straightened",
  );
}
