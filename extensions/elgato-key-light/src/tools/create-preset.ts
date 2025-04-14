import { randomUUID } from "crypto";
import { savePreset } from "../presets";

// TODO: Use `Preset` type from `presets.ts` when we support `Omit`
type Input = {
  /**
   * An emoji as the preset icon.
   */
  icon?: string;
  /**
   * The name of the preset.
   */
  name: string;
  /**
   * The settings of the preset.
   */
  settings: {
    /**
     * The brightness (percentage) of the key light.
     * @default 20
     * @min 0
     * @max 100
     */
    brightness?: number;
    /**
     * The temperature (percentage) of the key light.
     * @default 20
     * @min 0 (cold, ~2000K)
     * @max 100 (warm, ~7000K)
     */
    temperature?: number;
  };
};

export default async function tool(input: Input) {
  await savePreset({ ...input, id: randomUUID() });
}
