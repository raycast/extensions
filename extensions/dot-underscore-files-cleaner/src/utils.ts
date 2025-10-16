import { execSync } from "child_process";

export function isFile(path: string) {
  const result = execSync(
    `
      if [ -f "${path}" ]; then
        echo true
      else
        echo false
      fi
    `,
    { encoding: "utf-8" }
  ).replace(/\n/g, "");

  return result === "true";
}

export function deleteDotUnderscoreFiles(path: string) {
  execSync(`/usr/sbin/dot_clean "${path}"`);
}
