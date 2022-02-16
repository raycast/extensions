import { promisify } from "util";
import { LsofPrefix, readmeURL } from "./constants";
import { exec as cExec } from "child_process";
import { IProcessInfo, PortInfo } from "./interfaces";
import isDigit from "../utilities/isDigit";
import { closeMainWindow, confirmAlert, getPreferenceValues, open, Alert } from "@raycast/api";

const exec = promisify(cExec);

export default class ProcessInfo implements IProcessInfo {
  private static useSudo: boolean = getPreferenceValues().sudo ?? false;

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

  public static async getCurrent() {
    const cmd = `${ProcessInfo.useSudo ? "/usr/bin/sudo " : ""}/usr/sbin/lsof +c0 -iTCP -sTCP:LISTEN -P -FpcRuLPn`;
    try {
      const { stdout, stderr } = await exec(cmd);
      if (stderr) throw new Error(stderr);
      const processes = stdout.split("\np");
      const instances: ProcessInfo[] = [];
      for (const process of processes) {
        if (process.length === 0) continue;
        const lines = process.split("\n");
        const values: IProcessInfo = { pid: 0 };
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
        instances.push(
          new ProcessInfo(
            values.pid,
            values.name,
            values.parentPid,
            values.user,
            values.uid,
            values.protocol,
            values.portInfo
          )
        );
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
