import { environment, LaunchType } from "@raycast/api";
import { spawn } from "child_process";
import moment from "moment";
import { DEFAULT_PATH, runCommand } from "./cli";

export interface RealtimeBandwithData {
  index: number;
  seconds: number;
  rx: {
    ratestring: string;
    bytespersecond: number;
    packetspersecond: number;
    bytes: number;
    packets: number;
    totalbytes: number;
    totalpackets: number;
  };
  tx: {
    ratestring: string;
    bytespersecond: number;
    packetspersecond: number;
    bytes: number;
    packets: number;
    totalbytes: number;
    totalpackets: number;
  };
}

export const getActiveInterface = () => {
  const output = runCommand(`PATH=${DEFAULT_PATH} route -n get 0.0.0.0 | grep interface`).toString();

  const delimeterPosition = output.indexOf(":");

  const networkInterface = output.substring(delimeterPosition + 1, output.length).trim();

  return networkInterface;
};

export const watchBandwidth = ({
  networkInterface,
  onData,
  onError,
}: {
  networkInterface: string;
  onData: (info: RealtimeBandwithData) => void;
  onError: (error: any) => void;
}) => {
  let beforeProcessIds: number[] = [];

  const commandArguments = ["-i", networkInterface, "-l", "--json"];

  try {
    const output = runCommand(`pgrep -f 'vnstat ${commandArguments.join(" ")}'`);

    beforeProcessIds = output
      .split("\n")
      .filter(Boolean)
      .map((i) => Number(i));

    // eslint-disable-next-line no-empty
  } catch (error) {}

  const process = spawn(`PATH=${DEFAULT_PATH} && /opt/homebrew/bin/vnstat`, commandArguments, {
    shell: true,
  });

  let areBeforeProcessesKilled = false;

  process.stdout?.on("data", (data) => {
    try {
      const info: RealtimeBandwithData = JSON.parse(data.toString());

      if (!areBeforeProcessesKilled && environment.launchType !== LaunchType.UserInitiated) {
        areBeforeProcessesKilled = true;

        beforeProcessIds.forEach((pid) => {
          runCommand(`kill -9 ${pid}`);

          console.log(`pid: ${pid} killed`);
        });
      }

      onData(info);
      // eslint-disable-next-line no-empty
    } catch (error) {}
  });

  process.stderr?.on("data", (data) => {
    onError(data);
  });
};

export type BandWithData = {
  vnstatversion: string;
  jsonversion: string;
  interfaces: [
    {
      name: string;
      traffic: {
        total: { rx: number; tx: number };
        day: {
          id: number;
          date: { year: number; month: number; day: number };
          rx: number;
          tx: number;
        }[];
      };
      updated: {
        time: { hour: number; minute: number };
      };
    }
  ];
};

export const getBandwidthOfToday = (networkInterface: string) => {
  const output = runCommand(`vnstat -b today -i ${networkInterface} --json`);
  const data: BandWithData = JSON.parse(output);

  const defaultInterface = data.interfaces[0];

  const { hour, minute } = defaultInterface.updated.time;
  const { tx, rx } = defaultInterface.traffic.day[0];

  const lastUpdate = moment().set("hour", hour).set("minute", minute).format("HH:mm");

  return {
    tx,
    rx,
    lastUpdate,
  };
};
