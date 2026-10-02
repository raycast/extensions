import { State } from "@lib/haapi";
import { getDisplayName } from "@lib/utils";
import { createDeeplink } from "@raycast/utils";

const commandByDomain: Record<string, string> = {
  light: "lights",
  switch: "switches",
  cover: "covers",
  fan: "fans",
  media_player: "mediaplayers",
  automation: "automations",
  vacuum: "vacuums",
  camera: "cameras",
  script: "scripts",
  button: "buttons",
  scene: "scenes",
  person: "persons",
  sensor: "sensors",
  binary_sensor: "binarysensors",
  climate: "climate",
  weather: "weather",
  zone: "zones",
};

export function getEntityListCommand(entityId: string): string {
  const domain = entityId.split(".")[0];
  return commandByDomain[domain] ?? "index";
}

export function createEntityQuicklink(state: State, alias?: string): { name: string; link: string } {
  const displayName = getDisplayName(state, alias);
  return {
    name: `${displayName}`,
    link: createDeeplink({
      command: getEntityListCommand(state.entity_id),
      fallbackText: state.entity_id,
    }),
  };
}
