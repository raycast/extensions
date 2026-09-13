import { applyPresetAsHud } from "./lib/actions";

export default async function Command() {
  await applyPresetAsHud({ type: "predefined", index: 0 }, "Automatic");
}
