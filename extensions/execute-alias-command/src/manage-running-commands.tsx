import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

interface RunningProcess {
  id: string;
  command: string;
  alias: string;
  pid: number;
  startTime: Date;
  logFile: string;
}

// Path for storing process information
const PROCESS_DIR = join(homedir(), ".raycast-tmp", "running-processes");

// Ensure the directory exists
if (!existsSync(PROCESS_DIR)) {
  try {
    mkdirSync(PROCESS_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create process directory:", error);
  }
}

export default function Command() {
  const [processes, setProcesses] = useState<RunningProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<RunningProcess | null>(null);
  const [processOutput, setProcessOutput] = useState<string>("");
  const [tailMode, setTailMode] = useState(true);
  const [maxLines, setMaxLines] = useState(50);

  // Load running processes
  useEffect(() => {
    loadProcesses();

    // Refresh every 5 seconds
    const interval = setInterval(loadProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load process output when a process is selected
  useEffect(() => {
    if (selectedProcess && selectedProcess.logFile) {
      try {
        if (existsSync(selectedProcess.logFile)) {
          // Initial load of the log file
          loadLogFile(selectedProcess.logFile);

          // Set up log file monitoring - refresh every 2 seconds
          const logInterval = setInterval(() => {
            try {
              if (existsSync(selectedProcess.logFile)) {
                loadLogFile(selectedProcess.logFile);
              }
            } catch (refreshError) {
              console.error("Error refreshing log file:", refreshError);
            }
          }, 2000);

          // Clean up interval when unmounting or when selected process changes
          return () => clearInterval(logInterval);
        } else {
          setProcessOutput("No output available");
        }
      } catch (error) {
        setProcessOutput(`Error reading log file: ${error}`);
      }
    } else {
      setProcessOutput("");
    }
  }, [selectedProcess, tailMode, maxLines]);

  // Function to load log file content with optional tailing
  const loadLogFile = (logFile: string) => {
    try {
      let output = readFileSync(logFile, "utf-8");

      // If tail mode is enabled, only show the last N lines
      if (tailMode && output) {
        const lines = output.split("\n");
        if (lines.length > maxLines) {
          output = lines.slice(-maxLines).join("\n");
          output = `... (${lines.length - maxLines} more lines) ...\n\n${output}`;
        }
      }

      setProcessOutput(output);
    } catch (error) {
      setProcessOutput(`Error reading log file: ${error}`);
    }
  };

  const loadProcesses = () => {
    try {
      // Read all process files
      const processFiles = readdirSync(PROCESS_DIR).filter((file) => file.endsWith(".json"));

      const loadedProcesses: RunningProcess[] = [];

      for (const file of processFiles) {
        try {
          const processPath = join(PROCESS_DIR, file);
          const processData = JSON.parse(readFileSync(processPath, "utf-8")) as RunningProcess;

          // Check if process is still running
          try {
            execSync(`ps -p ${processData.pid} -o pid=`);
            // Process exists, add to list
            processData.startTime = new Date(processData.startTime);
            loadedProcesses.push(processData);
          } catch {
            // Process no longer exists, remove the file
            try {
              execSync(`rm "${processPath}"`);
              if (processData.logFile && existsSync(processData.logFile)) {
                execSync(`rm "${processData.logFile}"`);
              }
            } catch (rmError) {
              console.error(`Failed to remove process file: ${rmError}`);
            }
          }
        } catch (parseError) {
          console.error(`Failed to parse process file ${file}: ${parseError}`);
        }
      }

      setProcesses(loadedProcesses);
    } catch (error) {
      console.error("Failed to load processes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const terminateProcess = async (process: RunningProcess) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Terminating ${process.alias}...`,
      });

      // Kill the process
      execSync(`kill -9 ${process.pid}`);

      // Remove process file
      const processPath = join(PROCESS_DIR, `${process.id}.json`);
      if (existsSync(processPath)) {
        execSync(`rm "${processPath}"`);
      }

      // Remove log file
      if (process.logFile && existsSync(process.logFile)) {
        execSync(`rm "${process.logFile}"`);
      }

      showToast({
        style: Toast.Style.Success,
        title: `Process ${process.alias} terminated`,
      });

      // Refresh the list
      loadProcesses();
    } catch (error) {
      console.error(`Failed to terminate process: ${error}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to terminate process",
        message: String(error),
      });
    }
  };

  // Format time elapsed
  const getElapsedTime = (startTime: Date) => {
    const now = new Date();
    const elapsed = now.getTime() - startTime.getTime();

    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search running processes..."
      navigationTitle="Manage Running Commands"
      isShowingDetail={true}
      onSelectionChange={(id) => {
        const selected = processes.find((p) => p.id === id);
        setSelectedProcess(selected || null);
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Output Display Options"
          storeValue={true}
          onChange={(value) => {
            if (value === "full") {
              setTailMode(false);
            } else {
              setTailMode(true);
              setMaxLines(parseInt(value));
            }
          }}
        >
          <List.Dropdown.Item title="Show Full Output" value="full" />
          <List.Dropdown.Item title="Show Last 50 Lines" value="50" />
          <List.Dropdown.Item title="Show Last 100 Lines" value="100" />
          <List.Dropdown.Item title="Show Last 200 Lines" value="200" />
        </List.Dropdown>
      }
    >
      {processes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Check}
          title="No running processes"
          description="Processes launched with 'Execute Alias Command' extension will appear here"
        />
      ) : (
        processes.map((process) => (
          <List.Item
            key={process.id}
            id={process.id}
            icon={Icon.Play}
            title={process.alias}
            subtitle={process.command}
            accessories={[
              {
                text: `PID: ${process.pid}`,
                icon: Icon.Code,
              },
              {
                text: getElapsedTime(process.startTime),
                icon: Icon.Clock,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`## Process: ${process.alias}\n\n### Command\n\`\`\`bash\n${process.command}\n\`\`\`\n\n### Details\n- **PID**: ${process.pid}\n- **Started**: ${process.startTime.toLocaleString()}\n- **Running for**: ${getElapsedTime(process.startTime)}\n\n### Output\n\`\`\`\n${processOutput || "Loading output..."}\n\`\`\``}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Terminate Process"
                  icon={Icon.Stop}
                  onAction={() => terminateProcess(process)}
                  shortcut={{ modifiers: ["cmd"], key: "x" }}
                />
                <Action
                  title="Open Log in Text Editor"
                  icon={Icon.TextDocument}
                  onAction={() => {
                    if (process.logFile && existsSync(process.logFile)) {
                      execSync(`open -a TextEdit "${process.logFile}"`);
                    } else {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Log file not found",
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="View in Activity Monitor"
                  icon={Icon.Eye}
                  onAction={() => {
                    execSync(
                      `open -a "Activity Monitor" && osascript -e 'tell application "Activity Monitor" to activate' -e 'tell application "System Events" to tell process "Activity Monitor" to tell window 1 to tell search field 1 to set value to "${process.pid}"'`,
                    );
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowClockwise}
                  onAction={loadProcesses}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
