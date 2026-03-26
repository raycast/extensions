import { countSelection } from "./utils";

export default async function Command() {
  await countSelection((t) => (t.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length, "Consonants");
}
