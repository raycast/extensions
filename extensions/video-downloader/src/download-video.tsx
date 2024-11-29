import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { exec } from "child_process";

type Values = {
  videoURL: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    const { videoURL } = values;

    showToast({ title: "Downloading...", message: "Video is being downloaded" });

    // yt-dlp 명령어 실행, 전체 경로 사용
    const ytDlpPath = "/Library/Frameworks/Python.framework/Versions/3.12/bin/yt-dlp";
    const downloadPath = "~/Downloads/Downloader/%(title)s.%(ext)s";
    const command = `${ytDlpPath} -f best -o '${downloadPath}' ${videoURL}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error:", error);
        showToast({ title: "Error", message: stderr });
        return;
      }

      console.log("Output:", stdout);
      showToast({ title: "Download Complete", message: "The video has been downloaded to ~/Downloads" });
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
