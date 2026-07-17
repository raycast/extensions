import { getPreferenceValues, type Tool } from "@raycast/api";

type SetVolumeArgs = {
  volume: number;
};

/**
 * Set the volume of the KEF LSX2, LSX 2LT
 */
export default async function (args: SetVolumeArgs) {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`http://${preferences["ip-address"]}/api/setData`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "player:volume",
      roles: "value",
      value: { type: "i32_", i32_: args.volume },
    }),
  });
  if (!response.ok) {
    throw new Error(`KEF setData failed: ${response.status} ${response.statusText}`);
  }
}

export const confirmation: Tool.Confirmation<SetVolumeArgs> = async (input) => {
  return {
    info: [{ name: "Volume", value: input.volume.toString() }],
  };
};
