import { getDeviceInfo } from "../lib/nanoleaf-client";

export default async function tool() {
  const info = await getDeviceInfo();
  return {
    name: info.name,
    on: info.state.on.value,
    brightness: info.state.brightness.value,
    currentEffect: info.effects.select,
  };
}
