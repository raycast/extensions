import { Homey } from "../lib/Homey";

type Device = {
  deviceName: string;
  deviceId: string;
};

export default async function tool(): Promise<Device[]> {
  const homey = new Homey();
  await homey.auth();
  await homey.selectFirstHomey();
  const devices = await homey.getDevicesInGroups();
  return devices
    .map((deviceGroup) =>
      deviceGroup.devices.map((device) => ({
        deviceName: deviceGroup.name + " - " + device.name,
        deviceId: device.id,
      })),
    )
    .flat();
}
