import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { exec } from "child_process";
import { existsSync } from "fs";

type Values = {
  videoURL: string;
};

export default function Command() {
  function installDependencies(callback: () => void) {
    showToast({ title: "Checking dependencies...", message: "Ensuring Python and yt-dlp are installed" });

    const checkPython = `which python3`;
    exec(checkPython, (pythonError, pythonPath) => {
      if (pythonError || !pythonPath.trim()) {
        showToast({ title: "Installing Python", message: "Python is required. Please install Python manually." });
        console.error("Python not found. Please install it.");
        return;
      }

      const ytDlpPath = "/Library/Frameworks/Python.framework/Versions/3.12/bin/yt-dlp";
      if (!existsSync(ytDlpPath)) {
        showToast({ title: "Installing yt-dlp", message: "Please wait while yt-dlp is installed" });
        const installYtDlp = `${pythonPath.trim()} -m pip3 install yt-dlp`;
        exec(installYtDlp, (ytDlpError) => {
          if (ytDlpError) {
            showToast({ title: "Error installing yt-dlp", message: ytDlpError.message });
            console.error("Error installing yt-dlp:", ytDlpError);
            return;
          }

          showToast({ title: "Dependencies installed", message: "yt-dlp is ready to use" });
          callback();
        });
      } else {
        callback();
      }
    });
  }

  function handleSubmit(values: Values) {
    const { videoURL } = values;

    installDependencies(() => {
      showToast({ title: "Downloading...", message: "Video is being downloaded" });

      const ytDlpPath = "/Library/Frameworks/Python.framework/Versions/3.12/bin/yt-dlp";
      const downloadPath = "~/Downloads/Downloader/%(title)s.%(ext)s";
      const command = `${ytDlpPath} -o '${downloadPath}' ${videoURL}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Error:", error);
          showToast({ title: "Error", message: stderr });
          return;
        }

        console.log("Output:", stdout);
        showToast({ title: "Download Complete", message: "The video has been downloaded to ~/Downloads" });
      });
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="videoURL" title="Video URL" placeholder="Enter the video link" />
    </Form>
  );
}
