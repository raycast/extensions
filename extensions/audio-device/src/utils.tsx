export const createDeepLink = function <T>(command: string, context?: T) {
  const deeplink = `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/benvp/audio-device/${command}`;

  if (context) {
    const payload = encodeURIComponent(JSON.stringify(context));
    return `${deeplink}?context=${payload}`;
  }

  return deeplink;
};

// macOS names Bluetooth devices with a typographic apostrophe ("Jane’s AirPods"), while names typed
// into preferences often use a straight one (or the reverse), so treat both as the same character.
const normalizeDeviceName = (name: string) => name.replace(/[\u2018\u2019\u02BC]/g, "'");

const isSameDeviceName = (a: string, b: string) => normalizeDeviceName(a) === normalizeDeviceName(b);

// An exact match wins, so two devices that differ only in apostrophe style stay distinguishable.
export const findDeviceByName = <T extends { name: string }>(devices: T[], name: string) =>
  devices.find((d) => d.name === name) ?? devices.find((d) => isSameDeviceName(d.name, name));

export const normalizeAddress = (s: string) => s.replace(/[^0-9a-f]/gi, "").toLowerCase();

// Bluetooth audio devices carry their MAC in every uid form — "bt:<addr>"
// (unregistered) and "<addr>:input"/"<addr>:output" (registered) — so the MAC
// is the stable identity across those forms.
export const btAddressFromUid = (uid: string) =>
  uid
    .match(/(?:[0-9a-f]{2}[-:]){5}[0-9a-f]{2}/i)?.[0]
    .replace(/[^0-9a-f]/gi, "")
    .toLowerCase();
