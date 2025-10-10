import { LocalStorage } from "@raycast/api";
import { SERIAL_NUMBER_KEY } from "./constants";
import { getBluetoothDevices, lockDevice } from "./bluetooth";

export default async function Command() {
  const savedSerialNumber = await LocalStorage.getItem(SERIAL_NUMBER_KEY);
  const savedDevice = (await getBluetoothDevices()).find((value) => value.serialNumber === savedSerialNumber);

  if (savedDevice) {
    if (savedDevice.rssi * -1 > 80) {
      lockDevice();
    }
  }

  return;
}
