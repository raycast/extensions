import { promisify } from "util";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";
import { showToast, closeMainWindow } from "@raycast/api";

const execp = promisify(exec);

export class VPNConnection {
  connected: boolean;
  name: string;
  dev: string;
  image: string;

  constructor(connected: boolean, name: string, dev: string, image: string) {
    this.connected = connected;
    this.image = image;
    this.name = name;
    this.dev = dev;
  }
}

export class VPNDataList {
  private vpns: VPNConnection[];
  constructor() {
    this.vpns = [];
    this.refresh();
  }

  public getVPNs(): VPNConnection[] {
    return this.vpns;
  }

  public addVPN(vpn: VPNConnection) {
    this.vpns.push(vpn);
  }

  async refresh(): Promise<VPNDataList> {
    if (this.vpns.length != 0) {
      await sleep(1000);
    }

    const raw = await getVPNData();
    const extraRemoved = raw.replaceAll('"', "").replaceAll("(", "").replaceAll(")", "");
    const lines = extraRemoved.split("\n");

    this.vpns = [];

    for (const line of lines) {
      const [conn, name, dev] = line.split(" ");
      if (!name) continue;
      const connection = conn == "Connected";
      const vpn = new VPNConnection(connection, name, dev, "");
      this.addVPN(vpn);
    }

    return this;
  }
}

async function sleep(msec: number) {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

async function getVPNData(): Promise<string> {
  const script = "/usr/sbin/scutil --nc list | tail -n +2 | awk '{print $2, $6, $5}'";
  try {
    const { stdout } = await execp(script);
    return stdout;
  } catch (error) {
    console.log(error);
    return "";
  }
}

// export async function scutil(): Promise<VPNDataList> {
//   return await parseVPNData();
// }

async function executer(script: string, title: string, message: string) {
  try {
    const { stdout } = await execp(script);
    closeMainWindow();
    await showToast({ title, message });
    return stdout;
  } catch (error) {
    closeMainWindow();
    showFailureToast(error);
    return "";
  }
}

export async function connect(vpn: VPNConnection) {
  const script = `/usr/sbin/scutil --nc start ${vpn.name}`;
  const res = await executer(script, `Connected successfully to ${vpn.name}`, `Connected`);
  return res;
}

export async function disconnect(vpn: VPNConnection) {
  const script = `/usr/sbin/scutil --nc stop ${vpn.name}`;
  const res = await executer(script, `Disconnected successfully from ${vpn.name}`, `Disconnected`);
  return res;
}
