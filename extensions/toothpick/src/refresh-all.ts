import refreshBluetooth from "./core/devices/handlers/refresh-bluetooth";

export default async function Command() {
  await refreshBluetooth();
}
