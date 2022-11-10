import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.dock mineffect", { shell: true });
  const minEffect = String(out.output[1]).trim();
  const oldIndex = effects.indexOf(minEffect);
  const newIndex = oldIndex + 1 >= effects.length ? 0 : oldIndex + 1;
  spawnSync(`defaults write com.apple.dock mineffect ${effects[newIndex]} && killall Dock`, { shell: true });
  await showHUD("Current minimal effect: " + effectsTitle[newIndex]);
};

const effects = ["genie", "suck", "scale"];
const effectsTitle = ["Genie", "Suck", "Scale"];
