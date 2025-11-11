import { VPNConnection, VPNDataList, connect, disconnect } from "./scutil";
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  const engine = new VPNDataList();
  const vpns = (await engine.refresh()).getVPNs();

  let lastUsedVPNName = await LocalStorage.getItem("last-used");
  if (lastUsedVPNName === undefined) {
    lastUsedVPNName = vpns[0].name;
  }
  const vpn = vpns.find((v) => v.name == lastUsedVPNName);

  if (vpn?.connected) {
    await disconnect(vpn);
    return;
  }

  await connect(vpn as VPNConnection);
}
