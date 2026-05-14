import { getPreferenceValues, type Tool } from "@raycast/api";

type SetSourceArgs = {
  source: Source;
};

export type Source = "wifi" | "bluetooth" | "tv" | "optical" | "usb" | "aux" | "standby";

/**
 * Set the source of the KEF LSX2, LSX 2LT
 */
export default async function (args: SetSourceArgs) {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`http://${preferences["ip-address"]}/api/setData`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "settings:/kef/play/physicalSource",
      roles: "value",
      value: { type: "kefPhysicalSource", kefPhysicalSource: args.source },
    }),
  });
  if (!response.ok) {
    throw new Error(`KEF setData failed: ${response.status} ${response.statusText}`);
  }
}

export const confirmation: Tool.Confirmation<SetSourceArgs> = async (input) => {
  return {
    info: [{ name: "Source", value: input.source }],
  };
};
