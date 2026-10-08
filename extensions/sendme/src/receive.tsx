import {
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  Action,
  Icon,
  Detail,
  useNavigation,
} from "@raycast/api";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { useState, useEffect, useRef } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export default function ReceiveCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const { push } = useNavigation();

  // Reference to capture form values
  const ticketRef = useRef<string>("");
  const downloadDirRef = useRef<string[]>([homedir()]);

  // Check clipboard for possible ticket on startup
  const [clipboardContents, setClipboardContents] = useState("");
  useEffect(() => {
    async function checkClipboard() {
      try {
        const text = await Clipboard.readText();
        if (text && isValidTicket(text.trim())) {
          setClipboardContents(text.trim());
        }
      } catch (error) {
        // Ignore clipboard errors
      }
    }

    checkClipboard();
  }, []);

  // Get the best path to sendme
  const getSendmePath = (): string => {
    const possiblePaths = [
      "./sendme",
      path.join(homedir(), "sendme"),
      "/usr/local/bin/sendme",
      "/opt/homebrew/bin/sendme",
    ];

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) return p;
      } catch (e) {
        // Continue checking
      }
    }

    return "./sendme";
  };

  // Simple validation for ticket format
  const isValidTicket = (ticket: string): boolean => {
    // Tickets are typically blob followed by a long string of alphanumeric characters
    return /^blob[a-zA-Z0-9]{20,}$/i.test(ticket);
  };

  // Show download progress and final result
  const showDownloadDetails = (
    output: string,
    targetDir: string,
    error?: Error,
  ) => {
    push(
      <Detail
        markdown={`# File Download ${error ? "Error" : "Results"}
${error ? "## Error\n\nThere was an error downloading the file:\n\n```\n" + error.message + "\n```" : ""}

${error ? "## Command Output" : "## Download Details"}

\`\`\`
${output}
\`\`\`

${!error ? `\n\nFiles were downloaded to: \`${targetDir}\`` : ""}
`}
        actions={
          <ActionPanel>
            {!error && (
              <Action
                title="Open Download Folder"
                icon={Icon.Folder}
                onAction={() => {
                  exec(`open "${targetDir}"`);
                }}
              />
            )}
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                push(<ReceiveCommand />);
              }}
            />
          </ActionPanel>
        }
      />,
    );
  };

  // Process to download file with real-time output
  const downloadFile = async (
    ticket: string,
    targetDir: string,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const sendmePath = getSendmePath();
        let outputBuffer = "";

        // Create the target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Create a process to run in the target directory
        const childProcess = spawn(sendmePath, ["receive", ticket], {
          cwd: targetDir,
          env: { ...process.env, HOME: homedir() },
        });

        // Collect output for display
        childProcess.stdout.on("data", (data) => {
          const chunk = data.toString();
          outputBuffer += chunk;
          setDownloadProgress(outputBuffer);
        });

        childProcess.stderr.on("data", (data) => {
          const chunk = data.toString();
          outputBuffer += chunk;
          setDownloadProgress(outputBuffer);
        });

        // Handle errors
        childProcess.on("error", (err) => {
          console.error("Process error:", err);
          reject({ error: err, output: outputBuffer });
        });

        // Handle process completion
        childProcess.on("exit", (code) => {
          if (code === 0) {
            resolve(outputBuffer);
          } else {
            reject({
              error: new Error(`Process exited with code ${code}`),
              output: outputBuffer,
            });
          }
        });
      } catch (error) {
        reject({ error, output: "" });
      }
    });
  };

  // Terminal fallback for downloading
  const runInTerminal = async (
    ticket: string,
    targetDir: string,
  ): Promise<void> => {
    // Escape special characters in paths
    const escapedPath = targetDir.replace(/"/g, '\\"');
    const escapedTicket = ticket.replace(/"/g, '\\"');

    // Create the target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Create AppleScript to open Terminal, cd to the directory and run the command
    const scriptCommand = `
      osascript -e 'tell application "Terminal"
        activate
        do script "cd \\"${escapedPath}\\" && ./sendme receive ${escapedTicket}"
      end tell'
    `;

    await execAsync(scriptCommand);
    await showToast({
      style: Toast.Style.Success,
      title: "Command sent to Terminal",
      message: "Download will proceed in Terminal",
    });
  };

  // Main submission handler
  async function handleSubmit(values: {
    ticket: string;
    downloadDir: string[];
  }) {
    try {
      const { ticket, downloadDir } = values;

      if (!ticket) {
        throw new Error("Ticket is required");
      }

      // Fix: Extract first path from downloadDir array
      const downloadPath = downloadDir?.[0];
      if (!downloadPath) {
        throw new Error("Please select a download location");
      }

      // Validate ticket format
      if (!isValidTicket(ticket)) {
        throw new Error(
          "Invalid ticket format. Tickets should start with 'blob' followed by alphanumeric characters.",
        );
      }

      setIsLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting download...",
      });

      try {
        // Perform the download with the string path
        const output = await downloadFile(ticket, downloadPath);

        // Show success message
        await showToast({
          style: Toast.Style.Success,
          title: "Download complete",
          message: "File has been downloaded successfully",
        });

        // Show download details
        showDownloadDetails(output, downloadPath);
      } catch (error: any) {
        console.error("Error:", error);

        // Show error toast with terminal fallback option
        await showToast({
          style: Toast.Style.Failure,
          title: "Download failed",
          message: error.error?.message || "An error occurred",
          primaryAction: {
            title: "Try Terminal",
            onAction: () => runInTerminal(ticket, downloadPath),
          },
        });

        // Show download details with error
        showDownloadDetails(error.output || "", downloadPath, error.error);
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }

  // Updated Terminal action with refs
  const handleTerminalAction = async () => {
    const ticket = ticketRef.current;
    const downloadPath = downloadDirRef.current?.[0];

    if (!ticket) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ticket is required",
      });
      return;
    }

    if (!downloadPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a download location",
      });
      return;
    }

    runInTerminal(ticket, downloadPath);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download File"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
          <Action
            title="Download Via Terminal"
            icon={Icon.Terminal}
            onAction={handleTerminalAction}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ticket"
        title="Ticket"
        placeholder="Paste the sendme ticket (starts with 'blob')"
        info="Enter the ticket that was shared with you"
        defaultValue={clipboardContents}
        onChange={(value) => {
          setClipboardContents(value);
          ticketRef.current = value;
        }}
      />

      <Form.Separator />

      <Form.FilePicker
        id="downloadDir"
        title="Save Location"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        defaultValue={[homedir()]}
        onChange={(values) => {
          downloadDirRef.current = values;
        }}
      />

      {downloadProgress && (
        <Form.Description title="Download Progress" text={downloadProgress} />
      )}

      <Form.Description
        title="About Downloading Files"
        text="The file will download directly to the selected directory. Large files may take some time to complete. Press ⌘T to download via Terminal."
      />
    </Form>
  );
}
