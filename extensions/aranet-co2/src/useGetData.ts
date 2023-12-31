import { ChildProcess, exec } from "child_process";
import { useEffect, useState } from "react";
import { shellEnv } from "shell-env";

interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

interface AranetData {
  name: string;
  address: string;
  /** Received Signal Strength Indicator */
  rssi: number;
  co2: number;
  temperature: number;
  pressure: number;
  humidity: number;
}

let cachedEnv: null | EnvType = null;

const getCachedEnv = async () => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = {
    env: env,
    cwd: env.HOME || `/Users/${process.env.USER}`,
    shell: env.SHELL,
  };
  return cachedEnv;
};

export default function useGetData() {
  const [output, setOutput] = useState<string>("");
  const [finished, setFinished] = useState<boolean>(false);
  const [data, setData] = useState<AranetData | null>(null);

  useEffect(() => {
    let killed = false;
    let child: ChildProcess | null = null;

    const runCommand = async () => {
      const execEnv = await getCachedEnv();
      child = exec("claranet4 read", execEnv);
      child.stderr?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.stdout?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput((out) => `${out}${data}`);
      });
      child.on("exit", () => {
        if (killed) {
          return;
        }
        setFinished(true);
      });
    };
    runCommand();

    return function cleanup() {
      killed = true;
      if (child !== null) {
        child.kill("SIGTERM");
      }
    };
  }, [setOutput, setFinished]);

  useEffect(() => {
    if (!finished) return;

    const jsonData = output.slice(output.indexOf("{"), output.indexOf("}") + 1);
    setData(JSON.parse(jsonData) as AranetData);
  }, [output, finished]);

  return data;
}
