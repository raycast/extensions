import { Alert, closeMainWindow, confirmAlert, getPreferenceValues, open } from "@raycast/api";
import { exec as cExec } from "child_process";
import { promisify } from "util";
import isDigit from "../utilities/isDigit";
import { LsofPrefix, readmeURL } from "./constants";
import { PortInfo, ProcessInfo } from "./interfaces";

const exec = promisify(cExec);

export default class Process implements ProcessInfo {
  private static useSudo: boolean = getPreferenceValues().sudo ?? false;

  public path?: string;
  public parentPath?: string;
  private constructor(
    public readonly pid: number,
    public readonly name?: string,
    public readonly parentPid?: number,
    public readonly user?: string,
    public readonly uid?: number,
    public readonly protocol?: string,
    public readonly portInfo?: PortInfo[],
    public readonly internetProtocol?: string
  ) {}

  private async getProcessPath(pid: number, useSudo: boolean) {
    const cmd = `${useSudo ? "/usr/bin/sudo " : ""}/bin/ps -p ${pid} -o comm=`;
    const { stdout, stderr } = await exec(cmd);
    if (stderr) throw new Error(stderr);
    return stdout.replace("\n", "");
  }

  public async loadPath() {
    this.path = await this.getProcessPath(this.pid, Process.useSudo);
  }

  public async loadParentPath() {
    if (this.parentPid === undefined) return;
    this.parentPath = await this.getProcessPath(this.parentPid, Process.useSudo);
  }

  public static async getCurrent() {
    const cmd = `${Process.useSudo ? "/usr/bin/sudo " : ""}/usr/sbin/lsof +c0 -iTCP -w -sTCP:LISTEN -P -FpcRuLPn`;

    try {
      const { stdout, stderr } = await exec(cmd);
      if (stderr) throw new Error(stderr);
      const processes = stdout.split("\np");
      const instances: Process[] = [];
      for (const process of processes) {
        if (process.length === 0) continue;
        const lines = process.split("\n");
        const values: ProcessInfo = { pid: 0 };
        for (const line of lines) {
          if (line.length === 0) continue;
          const prefix = line[0];
          const value = line.slice(1);
          if (value.length === 0) continue;
          switch (prefix) {
            case LsofPrefix.PROCESS_ID:
              values.pid = Number(value);
              break;
            case LsofPrefix.PROCESS_NAME:
              values.name = value;
              break;
            case LsofPrefix.PARENT_PROCESS_ID:
              values.parentPid = Number(value);
              break;
            case LsofPrefix.USER_NAME:
              values.user = value;
              break;
            case LsofPrefix.USER_ID:
              values.uid = Number(value);
              break;
            case LsofPrefix.PROTOCOL:
              values.protocol = value;
              break;
            case LsofPrefix.PORTS:
              values.portInfo
                ? values.portInfo.push({
                    host: value.split(":")[0],
                    port: Number(value.split(":")[1]),
                  })
                : (values.portInfo = [
                    {
                      host: value.split(":")[0],
                      port: Number(value.split(":")[1]),
                    },
                  ]);
              break;
            case LsofPrefix.INTERNET_PROTOCOLL:
              values.internetProtocol = value;
              break;
            default:
              if (isDigit(prefix)) values.pid = Number(`${prefix}${value}`);
              break;
          }
        }
        const p = new Process(
          values.pid,
          values.name,
          values.parentPid,
          values.user,
          values.uid,
          values.protocol,
          values.portInfo
        );
        await p.loadPath();
        await p.loadParentPath();
        instances.push(p);
      }
      return instances;
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("sudo: a terminal is required to read the password")) {
          const alertOptions: Alert.Options = {
            title: "Can't Use Sudo",
            message:
              "It seems your user can't use sudo without a password. Please turn off using sudo in the extension preferences or change your sudo configuration.",
            primaryAction: {
              title: "Learn More",
            },
            dismissAction: {
              title: "Close Raycast",
            },
          };
          if (await confirmAlert(alertOptions)) {
            await open(readmeURL);
            await closeMainWindow();
          } else {
            await closeMainWindow();
          }
        }
        throw e;
      } else throw e;
    }
  }
}
