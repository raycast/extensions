import { ChildProcess, exec } from "child_process";
import { useEffect } from "react";
import { useGetCachedEnv } from "./useGetCachedEnv";
import { showToast, Toast } from "@raycast/api";

export const useRunCommand = (
  command: string,
  setOutput: (value: React.SetStateAction<string>) => void,
  setFinished: (value: React.SetStateAction<boolean>) => void
) => {
  const { getCachedEnv } = useGetCachedEnv();

  useEffect(() => {
    let killed = false;
    let child: ChildProcess | null = null;

    const runCommand = async () => {
      const execEnv = await getCachedEnv();

      child = exec(`$SHELL -i -c "${command}"`, execEnv);
      child.stderr?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        setOutput(data);
        showToast({
          style: Toast.Style.Failure,
          title: "Error executing command",
        });
        return;
      });

      child.stdout?.on("data", (data: string) => {
        if (killed) {
          return;
        }
        showToast({
          style: Toast.Style.Animated,
          title: "Executing command...",
        });
        setOutput(data);
      });
      child.on("exit", () => {
        showToast({
          style: Toast.Style.Success,
          title: "Command execution complete",
        });
        setFinished(true);
      });
    };

    runCommand();

    return () => {
      killed = true;
      if (child !== null) {
        child.kill("SIGTERM");
      }
    };
  }, [command, setOutput, setFinished]);
};
