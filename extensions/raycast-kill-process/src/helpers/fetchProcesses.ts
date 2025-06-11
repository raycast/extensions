import { exec } from "child_process";

export type Process = {
  id: string;
  cpu: string;
  type: "prefPane" | "app" | "binary";
  path: string | undefined;
  name: string;
};

export const fetchProcesses = async (): Promise<Process[]> =>
  new Promise((resolve, reject) => {
    exec(`ps -eo pid,pcpu,comm | sort -nrk 2,3`, (err, stdout) => {
      if (err != null) return reject(err);

      const processes = stdout
        .split("\n")
        .map<Process>((line) => {
          const [, id, cpu, path] = line.match(/(\d+)\s+(\d+[.|,]\d+)\s+(.*)/) ?? ["", "", "", ""];
          const name = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
          const isPrefPane = path.includes(".prefPane");
          const isApp = path.includes(".app");

          return {
            id,
            cpu,
            path,
            name,
            type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
          };
        })
        .filter((process) => process.name !== "");

      resolve(processes);
    });
  });
