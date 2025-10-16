declare module "wemo-client" {
  import DeviceInfo from "./baseTypes";
  class Wemo {
    discover: (fn: (err, deviceInfo: DeviceInfo) => void) => void;
    client: (info: DeviceInfo) => {
      getBinaryState: (cb: (err: Error, state: "0" | "1") => void) => void;
      setBinaryState: (binaryState: 0 | 1, cb: (err: Error, state: "0" | "1") => void) => void;
      getBrightness: (cb: (err: Error, state?: number) => void) => void;
      setBrightness: (brightness: number, cb: (err: Error, state: number) => void) => void;
    };
    static DEVICE_TYPE = {
      Bridge: "urn:Belkin:device:bridge:1",
      Switch: "urn:Belkin:device:controllee:1",
      Motion: "urn:Belkin:device:sensor:1",
      Maker: "urn:Belkin:device:Maker:1",
      Insight: "urn:Belkin:device:insight:1",
      LightSwitch: "urn:Belkin:device:lightswitch:1",
      Dimmer: "urn:Belkin:device:dimmer:1",
      Humidifier: "urn:Belkin:device:Humidifier:1",
      HeaterB: "urn:Belkin:device:HeaterB:1",
    };
  }
  export default Wemo;
}
