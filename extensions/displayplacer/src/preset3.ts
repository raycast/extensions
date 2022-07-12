import path from "path";
import loadPresetByIndex from "./utils/loadPresetByIndex";

export default async function main() {
  const index = parseInt(path.basename(__filename).replace("preset", "").replace(".js", "")) - 1;
  loadPresetByIndex(index);
  return null;
}
