// ---------- diskUtils ----------
import { exec } from "child_process";
import DiskSection from "./DiskSection";
import sudo from "sudo-prompt";

export async function execDiskCommand(command: string, options?: { sudo?: boolean }): Promise<string> {
  const env = {
    ...process.env,
    PATH: `${process.env.PATH ?? ""}:/usr/sbin:/usr/bin`,
    USER: process.env.USER ?? "root", // Set as needed
  };

  if (options?.sudo) {
    return new Promise<string>((resolve, reject) => {
      const sudoOptions = {
        name: "Raycast Diskutil",
        env,
      };
      sudo.exec(command, sudoOptions, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout?.toString() || "");
        }
      });
    });
  }

  return new Promise<string>((resolve, reject) => {
    exec(command, { env }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
