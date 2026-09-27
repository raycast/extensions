import Process from "../models/Process";
import { Exposure, classifyExposure } from "../utilities/exposure";

type Input = {
  /** Return only listeners on this TCP port. Omit to list every open port. */
  port?: number;
  /** Return only listeners with this network exposure. */
  exposure?: Exposure;
};

/** List the current TCP listeners, including the details shown by Open Ports and the menu bar. */
export default async function tool({ port, exposure }: Input) {
  if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    return "The port must be an integer between 0 and 65535.";
  }

  const processes = await Process.getCurrent();
  const listeners = processes.flatMap((process) => {
    const ports = (process.portInfo ?? []).filter(
      (info) =>
        (port === undefined || info.port === port) &&
        (exposure === undefined || classifyExposure(info.host) === exposure),
    );
    if (ports.length === 0) return [];

    return [
      {
        pid: process.pid,
        name: process.name,
        commandLine: process.commandLine,
        path: process.path,
        parentPid: process.parentPid,
        parentPath: process.parentPath,
        user: process.user,
        uid: process.uid,
        protocol: process.protocol,
        ports: ports.map((info) => ({ ...info, exposure: classifyExposure(info.host) })),
      },
    ];
  });

  return listeners.length > 0 ? JSON.stringify(listeners) : "No matching TCP listeners were found.";
}
