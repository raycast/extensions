import { getPreferenceValues } from "@raycast/api";
import http from "http";
import { exec } from "node:child_process";
import { promisify } from "util";
import { Preferences } from "..";

const execp = promisify(exec);
const { numi_cli_binary_path } = getPreferenceValues<Preferences>();

export const query = (q?: string): Promise<string[]> => {
  return new Promise((resolve, rejects) => {
    if (q) {
      let response = "";
      const req = http.request(
        {
          port: 15055,
          method: "GET",
          path: `/?q=${encodeURIComponent(q)}`,
        },
        (res) => {
          res.on("data", (data) => {
            response = `${response} ${data}`;
          });

          res.on("end", () => {
            resolve([response]);
          });
        }
      );

      req.on("error", (error) => {
        rejects(error);
      });

      req.end();
    } else {
      resolve([""]);
    }
  });
};

export const queryWithNumiCli = async (q?: string): Promise<string[]> => {
  q = q?.replace(/"/g, '\\"') || ""; // safe " in query
  const command = `${numi_cli_binary_path} "${q}"`;
  const res = await execp(command, { shell: "/bin/bash" });
  if (res.stderr) {
    console.error(res.stderr);
    return [];
  }
  let result = res.stdout;
  if (result.endsWith("\n")) result = result.slice(0, -1);
  result = Buffer.from(result).toString("utf8");
  return [result];
};
