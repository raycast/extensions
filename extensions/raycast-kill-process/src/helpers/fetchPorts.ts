import { exec } from "child_process";

export type Port = {
  pid: string;
  name: string;
  port: string;
};

export const fetchPorts = async (): Promise<Port[]> =>
  new Promise((resolve, reject) => {
    exec(`/usr/sbin/lsof -P -i :3000-30000`, (err, stdout) => {
      if (err != null) return reject(err);

      const ports = stdout
        .split("\n")
        .slice(1)
        .filter(Boolean)
        .map<Port>((line) => {
          const [, pid, , , , , , , name] = line.split(" ").filter(Boolean);

          return {
            pid: pid,
            name: name,
            port: name.split(":")[1],
          };
        })
        .filter((p) => !p.port.includes("->"))
        .filter((p) => !!p.port);

      resolve(ports);
    });
  });
