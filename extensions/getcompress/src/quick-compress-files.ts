import { LaunchProps, showToast, Toast } from "@raycast/api";
import {
  parseOutputFormatOverride,
  parseQualityOverride,
  parseQuickPresetIndex,
} from "./lib/constants";
import { compressSelectedFiles } from "./lib/run-command";
import { readSharedData } from "./lib/shared-data";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.QuickCompressFiles }>,
) {
  const { preset, quality, outputFormat } = props.arguments;
  const presetId = await resolvePresetId(preset);

  if (presetId === false) {
    return;
  }

  await compressSelectedFiles({
    presetId,
    quality: parseQualityOverride(quality),
    outputFormat: parseOutputFormatOverride(outputFormat),
  });
}

async function resolvePresetId(
  preset: string | undefined,
): Promise<string | undefined | false> {
  const presetIndex = parseQuickPresetIndex(preset);
  if (presetIndex === undefined) {
    return undefined;
  }

  const sharedData = await readSharedData();
  const reusablePreset = sharedData.reusablePresets[presetIndex];

  if (!reusablePreset) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Preset ${presetIndex + 1} is not available`,
      message:
        "Open GetCompress once to sync reusable presets, or choose Use Current Preset.",
    });
    return false;
  }

  return reusablePreset.id;
}
