import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

interface SetVolumeArguments {
  arguments: {
    percentage: string;
  };
}

export default async function main(input: SetVolumeArguments) {
  const percentageStr = input?.arguments?.percentage?.trim();

  if (!percentageStr) {
    await showHUD("Please enter a volume percentage");
    return;
  }

  const percentage = Number(percentageStr);
  if (isNaN(percentage) || percentage < 0 || percentage > 125) {
    await showHUD(`Please enter a value between 0 and 125 (got: '${percentageStr}')`);
    return;
  }

  const volume = Math.round((percentage / 100) * 256);

  try {
    await makeVLCRequest({ command: "volume", parameters: { val: volume.toString() } });
    await showHUD(`🔊 Volume set to ${percentage}%`);
  } catch (error) {
    await handleVLCError(error, "set volume");
  }
}
