import { ActionPanel, Action, List, showToast, Toast, Icon, getPreferenceValues, open } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { showFailureToast } from "@raycast/utils";

// Create a unique process ID
const generateProcessId = () => uuidv4();

// Path for storing process information
const PROCESS_DIR = join(homedir(), ".raycast-tmp", "running-processes");
const LOG_DIR = join(homedir(), ".raycast-tmp", "process-logs");

// Ensure the directories exist
if (!existsSync(PROCESS_DIR)) {
  try {
    mkdirSync(PROCESS_DIR, { recursive: true });
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to create process directory",
    });
  }
}

if (!existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to create log directory",
    });
  }
}

interface Preferences {
  terminalApp: string;
  aliasFilePath: string;
}

interface Alias {
  name: string;
  command: string;
  description?: string;
}

interface ProcessInfo {
  id: string;
  command: string;
  alias: string;
  pid: number;
  startTime: Date;
  logFile: string;
}

// Function to check if an application exists
const appExists = (appName: string): boolean => {
  try {
    execSync(`osascript -e 'tell application "System Events" to (name of processes) contains "${appName}"'`);
    return true;
  } catch {
    return false;
  }
};

// Function to get a valid terminal application
const getValidTerminalApp = (preferredApp: string): string => {
  // Check if the preferred app exists
  if (appExists(preferredApp)) {
    return preferredApp;
  }

  // Fallback terminals to try
  const fallbackTerminals = ["Terminal", "iTerm", "Alacritty", "Warp", "Hyper"];

  // Find the first available terminal
  for (const terminal of fallbackTerminals) {
    if (appExists(terminal)) {
      return terminal;
    }
  }

  // If all else fails, return Terminal (Apple's default)
  return "Terminal";
};

const ignoreCommandKey = "hideraycast";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const preferredTerminal = preferences.terminalApp || "Terminal";
  const aliasFilePath = preferences.aliasFilePath || "~/.zshrc";

  // Resolve the alias file path (supporting ~ for home directory)
  const resolvedAliasFilePath = aliasFilePath.replace(/^~\//, `${homedir()}/`);

  const [terminalApp, setTerminalApp] = useState(preferredTerminal);

  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    // Get a valid terminal application
    const validTerminal = getValidTerminalApp(preferredTerminal);
    setTerminalApp(validTerminal);

    try {
      if (!existsSync(resolvedAliasFilePath)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Alias file not found",
          message: `${aliasFilePath} does not exist. Check your settings.`,
        });
        setIsLoading(false);
        return;
      }

      const content = readFileSync(resolvedAliasFilePath, "utf-8");

      // Parse aliases from config file
      const lines = content.split("\n");
      const aliasLines = lines
        .map((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("alias")) {
            // Check if previous line has "hideraycast"
            const prevLine = index > 0 ? lines[index - 1].trim() : "";

            // Check if the alias should be hidden (either in previous line or in line itself)
            if (prevLine.includes(ignoreCommandKey) || trimmed.includes(ignoreCommandKey)) {
              return null;
            }
            return line;
          }
          return null;
        })
        .filter(Boolean) as string[];

      const parsedAliases = aliasLines
        .map((line) => {
          // Extract alias name and command
          const match = line.match(/alias\s+([^=]+)=(?:["'](.+?)["']|([^;"\s]+))(?:;|\s|$)/);
          if (match) {
            // Get the line index
            const lineIndex = lines.indexOf(line);
            let description = "";

            // Check the current line for a man comment
            const currentLineMatch = line.match(/#\s*man:\s*([^#]+)(?:#|$)/);
            if (currentLineMatch) {
              description = currentLineMatch[1].trim();
            }

            // If no description found and there's a previous line, check that too
            if (!description && lineIndex > 0) {
              const prevLine = lines[lineIndex - 1];
              const prevLineMatch = prevLine.match(/#\s*man:\s*([^#]+)(?:#|$)/);
              if (prevLineMatch) {
                description = prevLineMatch[1].trim();
              }
            }

            return {
              name: match[1].trim(),
              command: (match[2] || match[3] || "").trim(),
              description: description,
            };
          }
          return null;
        })
        .filter(Boolean) as Alias[];

      setAliases(parsedAliases);
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to load aliases",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to save process information for tracking
  const saveProcessInfo = (processInfo: ProcessInfo) => {
    try {
      const processFilePath = join(PROCESS_DIR, `${processInfo.id}.json`);
      writeFileSync(processFilePath, JSON.stringify(processInfo));
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to save process info",
      });
    }
  };

  const executeCommand = async (command: string, aliasName: string, detached = false) => {
    try {
      // Check if command contains special characters that might need terminal
      const hasComplexSyntax = /[|&;()<>]/.test(command);

      if (detached) {
        showToast({
          style: Toast.Style.Animated,
          title: "Running command in background...",
        });

        // Create a unique process ID
        const processId = generateProcessId();
        const logFile = join(LOG_DIR, `${processId}.log`);

        // Create a script that will execute the command in background and capture output
        const tmpDir = join(homedir(), ".raycast-tmp");
        execSync(`mkdir -p ${tmpDir}`);

        const detachedScript = join(tmpDir, `detached-command-${Date.now()}.sh`);
        const scriptContent = `#!/bin/zsh
source "${resolvedAliasFilePath}"
# Execute the command and capture its output to the log file
(${command}) > "${logFile}" 2>&1 &
# Store the PID of the background process
echo $! > "${join(tmpDir, `${processId}.pid`)}"
`;

        writeFileSync(detachedScript, scriptContent);
        execSync(`chmod +x ${detachedScript}`);
        execSync(detachedScript, { stdio: "ignore" });

        // Get the PID from the temporary file
        const pidFile = join(tmpDir, `${processId}.pid`);
        const pid = parseInt(readFileSync(pidFile, "utf-8").trim());
        execSync(`rm ${pidFile}`);

        // Clean up the script
        execSync(`rm ${detachedScript}`);

        // Save process information for tracking
        const processInfo: ProcessInfo = {
          id: processId,
          command,
          alias: aliasName,
          pid,
          startTime: new Date(),
          logFile,
        };

        saveProcessInfo(processInfo);

        showToast({
          style: Toast.Style.Success,
          title: "Command started in background",
          primaryAction: {
            title: "Manage Running Commands",
            onAction: () => {
              open("raycast://extensions/felix_wortmann/execute-alias-command/manage-running-commands");
            },
          },
        });
        return;
      }

      if (hasComplexSyntax) {
        // For complex commands, open in Terminal to avoid issues
        showToast({
          style: Toast.Style.Animated,
          title: `Opening command in ${terminalApp}...`,
          message: "Command contains special characters",
        });

        // Use a more direct and reliable approach to open in terminal
        try {
          // Properly escape the command for AppleScript
          const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");

          // Use AppleScript directly rather than through a temporary script
          execSync(
            `osascript -e 'tell application "${terminalApp}" to activate' -e 'tell application "${terminalApp}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
          );

          showToast({
            style: Toast.Style.Success,
            title: `Command opened in ${terminalApp}`,
          });
        } catch (terminalError) {
          showFailureToast(terminalError, {
            title: "Error opening terminal",
          });

          // If the primary method fails, try an alternative approach with a different terminal
          try {
            // Try with the default Terminal app as fallback
            const fallbackTerminal = "Terminal";
            showToast({
              style: Toast.Style.Animated,
              title: `Trying fallback terminal: ${fallbackTerminal}...`,
            });

            const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
            execSync(
              `osascript -e 'tell application "${fallbackTerminal}" to activate' -e 'tell application "${fallbackTerminal}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
            );

            showToast({
              style: Toast.Style.Success,
              title: `Command opened in ${fallbackTerminal}`,
            });
          } catch (fallbackError) {
            showFailureToast(fallbackError, {
              title: "Error opening fallback terminal",
            });

            // If all else fails, copy to clipboard
            execSync(`echo '${command.replace(/'/g, "\\'")}' | pbcopy`);
            showToast({
              style: Toast.Style.Success,
              title: "Command copied to clipboard",
            });
          }
        }
        return;
      }

      // For non-complex, non-detached commands, we'll still run them in background mode
      // but provide a more interactive experience
      showToast({ style: Toast.Style.Animated, title: "Executing command..." });

      // Create a unique process ID for tracking
      const processId = generateProcessId();
      const logFile = join(LOG_DIR, `${processId}.log`);

      // Create a temporary directory if it doesn't exist
      const tmpDir = join(homedir(), ".raycast-tmp");
      execSync(`mkdir -p ${tmpDir}`);

      // Create a unique temporary script file
      const tmpScriptPath = join(tmpDir, `alias-command-${Date.now()}.sh`);

      // Instead of using tee which would make it synchronous, we'll redirect to the log file
      // and run the command in the background
      const tmpScriptContent = `#!/bin/zsh
source "${resolvedAliasFilePath}"
# Execute the command and capture its output to the log file
(${command}) > "${logFile}" 2>&1 &
# Store the PID of the background process
echo $! > "${join(tmpDir, `${processId}.pid`)}"
`;

      writeFileSync(tmpScriptPath, tmpScriptContent);
      execSync(`chmod +x ${tmpScriptPath}`);

      // Run the script but don't wait for it to complete
      execSync(tmpScriptPath, { stdio: "ignore" });

      // Get the PID from the temporary file
      const pidFile = join(tmpDir, `${processId}.pid`);
      // Wait a brief moment for the PID file to be created
      await new Promise((resolve) => setTimeout(resolve, 500));

      let pid = 0;
      try {
        pid = parseInt(readFileSync(pidFile, "utf-8").trim());
        execSync(`rm ${pidFile}`);
      } catch (pidError) {
        showFailureToast(pidError, {
          title: "Error reading PID file",
        });
      }

      // Clean up the script
      execSync(`rm ${tmpScriptPath}`);

      // Save process information for tracking
      const processInfo: ProcessInfo = {
        id: processId,
        command,
        alias: aliasName,
        pid,
        startTime: new Date(),
        logFile,
      };

      saveProcessInfo(processInfo);

      showToast({
        style: Toast.Style.Success,
        title: "Command started",
        message: "Check 'Manage Running Commands' to view progress",
        primaryAction: {
          title: "Manage Running Commands",
          onAction: () => {
            open("raycast://extensions/felix_wortmann/execute-alias-command/manage-running-commands");
          },
        },
      });
    } catch (error) {
      // Display more helpful error message
      const errorMsg = String(error);
      const friendlyMessage = errorMsg.includes("status 2")
        ? "Syntax error in command - try opening in Terminal"
        : errorMsg;

      showFailureToast(error, {
        title: "Failed to execute command",
        message: friendlyMessage,
      });

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to execute command",
        message: friendlyMessage,
        primaryAction: {
          title: `Open in ${terminalApp}`,
          onAction: () => {
            try {
              // Properly escape the command for AppleScript
              const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");

              // Use AppleScript directly
              execSync(
                `osascript -e 'tell application "${terminalApp}" to activate' -e 'tell application "${terminalApp}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
              );
            } catch (terminalError) {
              showFailureToast(terminalError, {
                title: "Error opening terminal",
              });

              // Try with the default Terminal app as fallback
              try {
                const fallbackTerminal = "Terminal";
                showToast({
                  style: Toast.Style.Animated,
                  title: `Trying fallback terminal: ${fallbackTerminal}...`,
                });

                const escapedCommand = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
                execSync(
                  `osascript -e 'tell application "${fallbackTerminal}" to activate' -e 'tell application "${fallbackTerminal}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
                );

                showToast({
                  style: Toast.Style.Success,
                  title: `Command opened in ${fallbackTerminal}`,
                });
              } catch (fallbackError) {
                showFailureToast(fallbackError, {
                  title: "Error opening fallback terminal",
                });

                // If all else fails, copy to clipboard
                execSync(`echo '${command.replace(/'/g, "\\'")}' | pbcopy`);
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to open terminal",
                  message: "Command copied to clipboard instead",
                });
              }
            }
          },
        },
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search aliases..."
      filtering={true}
      isShowingDetail={showingDetail}
      navigationTitle="Execute Alias Command"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Toggle Detail View"
          storeValue={true}
          onChange={(newValue) => {
            setShowingDetail(newValue === "detail");
          }}
        >
          <List.Dropdown.Item title="Show Details" value="detail" />
          <List.Dropdown.Item title="Hide Details" value="list" />
        </List.Dropdown>
      }
    >
      {aliases.map((alias) => (
        <List.Item
          key={alias.name}
          icon={Icon.Terminal}
          title={alias.name}
          subtitle={alias.description || ""}
          detail={
            <List.Item.Detail
              markdown={`## ${alias.name}\n\n${
                alias.description ? `### Description\n${alias.description}\n\n` : ""
              }### Command\n\`\`\`bash\n${alias.command}\n\`\`\`\n\n### Execution Options\n- **Detach Instantly** (⌘+Enter): Run in background with no terminal window\n- **Execute in Terminal** (⌘+⇧+Enter): Run in a terminal window\n\n### Settings\n- Terminal App: ${terminalApp}\n- Alias File: ${aliasFilePath}`}
            />
          }
          accessories={[
            {
              text: alias.command,
              icon: Icon.Code,
              tooltip: `Command: ${alias.command}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Start Command"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  try {
                    executeCommand(alias.command, alias.name, true);
                  } catch (error) {
                    showFailureToast(error, {
                      title: "Failed to execute command",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action
                title="Execute in Terminal"
                icon={Icon.Terminal}
                onAction={() => {
                  try {
                    // Properly escape the command for AppleScript
                    const escapedCommand = alias.command
                      .replace(/\\/g, "\\\\")
                      .replace(/"/g, '\\"')
                      .replace(/'/g, "\\'");

                    // Use AppleScript directly
                    execSync(
                      `osascript -e 'tell application "${terminalApp}" to activate' -e 'tell application "${terminalApp}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
                    );
                  } catch (error) {
                    showFailureToast(error, {
                      title: "Error opening terminal",
                    });

                    // Try with the default Terminal app as fallback
                    try {
                      const fallbackTerminal = "Terminal";
                      showToast({
                        style: Toast.Style.Animated,
                        title: `Trying fallback terminal: ${fallbackTerminal}...`,
                      });

                      const escapedCommand = alias.command
                        .replace(/\\/g, "\\\\")
                        .replace(/"/g, '\\"')
                        .replace(/'/g, "\\'");
                      execSync(
                        `osascript -e 'tell application "${fallbackTerminal}" to activate' -e 'tell application "${fallbackTerminal}" to do script "source \\"${resolvedAliasFilePath}\\" && ${escapedCommand}"'`,
                      );

                      showToast({
                        style: Toast.Style.Success,
                        title: `Command opened in ${fallbackTerminal}`,
                      });
                    } catch (fallbackError) {
                      showFailureToast(fallbackError, {
                        title: "Error opening fallback terminal",
                      });

                      // If all else fails, copy to clipboard
                      execSync(`echo '${alias.command.replace(/'/g, "\\'")}' | pbcopy`);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Command copied to clipboard instead",
                      });
                    }
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title="Manage Running Commands"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={() => {
                  // Open the manage-running-commands command using Raycast URL scheme
                  open("raycast://extensions/felix_wortmann/execute-alias-command/manage-running-commands");
                }}
              />
              <Action.CopyToClipboard
                title="Copy Command"
                content={alias.command}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Alias"
                content={alias.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
