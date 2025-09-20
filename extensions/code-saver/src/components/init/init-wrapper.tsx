import { Action, ActionPanel, Detail } from "@raycast/api";
import { FC, useState, useEffect } from "react";
import InitError from "./init-error";
import {
  checkDBStorePath,
  upgradeDBSchema,
  InitTaskFunc,
  backupDB,
  InitErrorMarkDown,
  downloadDependency,
} from "./init-tasks";

export interface InitWrapperProps {
  children: React.ReactNode;
}

// '❓' waiting for execution
// '⌛' during execution
// '✅' executed successfully
// '🚨' something wrong when it is executed
type InitTaskStatus = "❓" | "⌛" | "✅" | "🚨";
// InitStatus indicats whether all init task is executed completed
type InitStatus = "ongoing" | "allpass" | "failed";
type TaskDescOrErrMsg = string | InitErrorMarkDown;
type InitTask = [InitTaskStatus, TaskDescOrErrMsg, InitTaskFunc];

export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  console.log("rendering!");
  const [initTasks, setInitTasks] = useState<InitTask[]>([
    ["❓", "download dependency", downloadDependency],
    ["❓", "check db store path", checkDBStorePath],
    ["❓", "backup the DB Store", backupDB],
    ["❓", "upgrade db schema", upgradeDBSchema],
  ]);
  // currentTaskId is the index of initTasks
  const [currentTaskId, setCurrentTaskId] = useState<number>(0);
  // it will be one text playing loop from . to ...
  // it will be appended
  const [progressBar, setProgressBar] = useState<string>("");

  useEffect(() => {
    console.log("use effect, execTaskId:", currentTaskId);
    let ignore = false;
    const clearFunc = () => {
      ignore = true;
      console.log("clear effects, execTaskId:", currentTaskId);
    };
    if (currentTaskId >= initTasks.length) {
      return clearFunc;
    }
    const [status, desc, initFunc] = initTasks[currentTaskId];

    if (status != "❓") {
      console.log("status is not ❓. (execTaskId, desc, status):", currentTaskId, desc, status);
      return clearFunc;
    }
    console.log("use effect, status is not executed. (execTaskId, desc, ignore):", currentTaskId, desc, ignore);
    if (ignore) {
      return clearFunc;
    }
    setInitTasks(initTasks.map((task, idx) => (idx == currentTaskId ? ["⌛", task[1], task[2]] : task)));
    console.log("use effect, executed func", currentTaskId);
    initFunc()
      .then((res) => {
        console.log("use effect, get result of func", currentTaskId);
        if (res.none) {
          console.log("use effect, chanege status to success", currentTaskId);
          setInitTasks(initTasks.map((task, idx) => (idx == currentTaskId ? ["✅", task[1], task[2]] : task)));
          console.log("use effect, change to next id, curr id:", currentTaskId);
          setCurrentTaskId(currentTaskId + 1);
        } else {
          console.log("use effect, chanege status to failed", currentTaskId);
          setInitTasks(initTasks.map((task, idx) => (idx == currentTaskId ? ["🚨", res.val, task[2]] : task)));
        }
      })
      .catch((err) => {
        console.log("use effect, unexpected issue. chanege status to failed", currentTaskId);
        setInitTasks(initTasks.map((task, idx) => (idx == currentTaskId ? ["🚨", String(err), task[2]] : task)));
      });
    return clearFunc;
  }, [currentTaskId]);

  const initStatusSet = new Set<InitTaskStatus>(initTasks.map((e) => e[0]));
  const initStatus: InitStatus = initStatusSet.has("🚨")
    ? "failed"
    : initStatusSet.has("❓") || initStatusSet.has("⌛")
    ? "ongoing"
    : "allpass";

  const checkingPrompt = `## Trying to synchronize the application
${initTasks.map(([status, prompt]) => `- ${status} ${prompt} ${status == "⌛" ? progressBar : ""}`).join("\n")}
`;
  // by right the errMsg will always be valid markdown string
  // because we use it when and only when initStatus is failed
  const errMsg = initTasks.find(([status, ,]) => status == "🚨")?.[1];

  // use it to impl loading animation
  useEffect(() => {
    console.log("useEffect, progressBar, set timeout");
    const timeout = setTimeout(() => {
      const newBar = Array((progressBar.length + 1) % 4)
        .fill(".")
        .join("");
      setProgressBar(newBar);
    }, 500);
    if (initStatus != "ongoing") {
      console.log("useEffect, progressBar, not on going, clear timeout");
      clearTimeout(timeout);
    }
    return () => {
      console.log("useEffect, progressBar, unmount, clear timeout");
      clearTimeout(timeout);
    };
  }, [initTasks, currentTaskId, progressBar]);

  return initStatus == "allpass" ? (
    <>{children}</>
  ) : initStatus == "failed" ? (
    <InitError errMarkdown={errMsg ? errMsg : ""} />
  ) : (
    <Detail
      navigationTitle="Trying to initialize your snippets store"
      markdown={checkingPrompt}
      isLoading={initStatus == "ongoing" ? true : false}
      actions={
        <ActionPanel>
          <Action
            title="Change Checking"
            onAction={() => {
              console.log("checking");
            }}
          />
        </ActionPanel>
      }
    />
  );
};
