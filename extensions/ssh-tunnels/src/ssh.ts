import { spawn } from "child_process";
import SSHConfig from "ssh-config";
import find from "find-process";
import { homedir } from "os";
import { readFileSync } from "fs";

export interface PortForward {
    type: "local" | "remote" | "dynamic";
    host: string;
    src: number;
    dst: number;
    bind?: string;
}

export interface Connection {
    host: string;
    fwds: PortForward[];
    pid?: number;
}

export interface PortForwardGroup {
    host: string;
    fwds: PortForward[];
    cons: Connection[];
}

export async function getConnections(): Promise<Connection[]> {
    const processes = (await find("name", "ssh")).filter((proc) => proc.name == "ssh");

    return processes.map((proc) => {
        const args = proc.cmd.split(" ").splice(1);
        const fwds = [];
        const pid = proc.pid;
        let host = "";

        while (args.length > 0) {
            const first = args.shift() || "";

            // consume options
            if (first.startsWith("-")) {
                switch (first) {
                    case "-R":
                    case "-L": {
                        const second = args.shift();
                        if (second === undefined) break;
                        const fwd = second.split(":");
                        const type = first == "-L" ? "local" : "remote";

                        if (fwd.length == 3) {
                            fwds.push({
                                type,
                                src: Number(fwd[0]),
                                dst: Number(fwd[2]),
                                host: fwd[1],
                            } as PortForward);
                        }

                        if (fwd.length == 4) {
                            fwds.push({
                                type,
                                src: Number(fwd[1]),
                                dst: Number(fwd[3]),
                                bind: fwd[0],
                                host: fwd[2],
                            } as PortForward);
                        }

                        break;
                    }

                    case "-D": {
                        const second = args.shift();
                        if (second === undefined) break;
                        fwds.push({
                            type: "dynamic",
                            src: Number(second),
                            dst: Number(second),
                            host: "localhost",
                        } as PortForward);

                        break;
                    }

                    case "-4":
                    case "-6":
                    case "-A":
                    case "-a":
                    case "-C":
                    case "-f":
                    case "-G":
                    case "-g":
                    case "-K":
                    case "-k":
                    case "-M":
                    case "-N":
                    case "-n":
                    case "-q":
                    case "-s":
                    case "-T":
                    case "-t":
                    case "-V":
                    case "-v":
                    case "-vv":
                    case "-vvv":
                    case "-X":
                    case "-x":
                    case "-y":
                    default:
                        break;
                }
            } else {
                host = first;
                break;
            }
        }

        fwds.push(...getPortForwardsForHost(host));

        return { host, fwds, pid } as Connection;
    }) as Connection[];
}

export async function getPortForwardGroups(): Promise<PortForwardGroup[]> {
    const connections = await getConnections();
    const groups: { [key: string]: PortForwardGroup } = {};

    connections.forEach((c) => {
        c.fwds.forEach((f) => {
            const host = ["localhost", "127.0.0.1"].includes(f.host) ? c.host : f.host;
            if (!(host in groups))
                groups[host] = {
                    host: host,
                    fwds: [f],
                    cons: [c],
                } as PortForwardGroup;
            else {
                groups[host].fwds.push(f);
                if (groups[host].cons.indexOf(c) == -1) groups[host].cons.push(c);
            }
        });
    });

    return Object.values(groups);
}

export function getPortForwardsForHost(host: string): PortForward[] {
    try {
        const file = readFileSync(homedir() + "/.ssh/config");
        const config = SSHConfig.parse(file.toString()).compute(host);
        const fwds: PortForward[] = [];

        if ("LocalForward" in config) {
            (config["LocalForward"] as unknown as string[]).forEach((v) => {
                const [a, b] = v.split(" ");
                const [host, dst] = b.split(":");

                const split = a.split(":");
                let bind: string | undefined = split[0];
                let src: string | undefined = split[1];
                if (src === undefined) {
                    src = bind;
                    bind = undefined;
                }

                fwds.push({
                    type: "local",
                    src: Number(src),
                    dst: Number(dst),
                    host,
                    bind,
                });
            });
        }

        if ("RemoteForward" in config) {
            (config["RemoteForward"] as unknown as string[]).forEach((v) => {
                const [a, b] = v.split(" ");
                const [host, dst] = b.split(":");

                const split = a.split(":");
                let bind: string | undefined = split[0];
                let src: string | undefined = split[1];
                if (src === undefined) {
                    src = bind;
                    bind = undefined;
                }

                fwds.push({
                    type: "remote",
                    src: Number(src),
                    dst: Number(dst),
                    host,
                    bind,
                });
            });
        }

        if ("DynamicForward" in config) {
            (config["DynamicForward"] as unknown as string[]).forEach((v) =>
                fwds.push({
                    type: "dynamic",
                    src: Number(v),
                    dst: Number(v),
                    host: "localhost",
                } as PortForward)
            );
        }

        return fwds;
    } catch (e) {
        return [];
    }
}

export function getPortDescription(fwds: PortForward[], with_hosts = false) {
    const local: string[] = [];
    const remote: string[] = [];
    const dynamic: string[] = [];
    let result = "";

    fwds.forEach((f) => {
        const host = with_hosts && !["localhost", "127.0.0.1"].includes(f.host) ? `${f.host}:` : "";
        const port = f.dst && f.src != f.dst ? `${f.src}:${host}${f.dst}` : `${host}${f.src}`;

        switch (f.type) {
            case "local":
                local.push(port);
                break;
            case "remote":
                remote.push(port);
                break;
            case "dynamic":
                dynamic.push(port);
                break;
        }
    });

    if (local.length > 0) result += `← [${local.join(", ")}] `;
    if (remote.length > 0) result += `→ [${remote.join(", ")}] `;
    if (dynamic.length > 0) result += `←D [${dynamic.join(", ")}] `;
    return result;
}

export function open(c: Connection) {
    const args = ["ssh", "-N"];
    for (const fwd of c.fwds) {
        switch (fwd.type) {
            case "local":
            case "remote":
                args.push(fwd.type == "local" ? "-L" : "-R");
                args.push(
                    fwd.bind ? `${fwd.bind}:${fwd.src}:${fwd.host}:${fwd.dst}` : `${fwd.src}:${fwd.host}:${fwd.dst}`
                );
                break;

            case "dynamic":
                args.push("-D");
                args.push(`${fwd.src}`);
                break;
        }
    }
    args.push(c.host);
    return spawn("/usr/bin/env", args);
}
