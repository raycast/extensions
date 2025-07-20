import { Form, ActionPanel, Action, showHUD, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in VLC"
            onSubmit={async ({ video: [video], subtitle }) => {
              if (!video) {
                await showHUD("Please select a video file");
                return;
              }
              const subtitleFile = subtitle?.[0];
              await closeMainWindow();
              const args = ["--args"];
              if (subtitleFile) args.push(`--sub-file="${subtitleFile}"`);
              args.push(`"${video}"`);
              const cmd = `open -a VLC ${args.join(" ")}`;
              exec(cmd, (error) => {
                let message = "VLC opened";
                if (error) message = "Failed to open VLC";
                else if (subtitleFile) message = "VLC opened with subtitle";
                showHUD(message);
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="video" title="Video File" allowMultipleSelection={false} />
      <Form.FilePicker id="subtitle" title="Subtitle File (Optional)" allowMultipleSelection={false} />
    </Form>
  );
}
