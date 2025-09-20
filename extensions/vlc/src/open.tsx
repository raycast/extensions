import { Form, ActionPanel, Action, showHUD, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <Form
      navigationTitle="Open in VLC"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in Vlc"
            onSubmit={async ({ video: [video], subtitle }) => {
              if (!video) {
                await showHUD("Please select a video file");
                return;
              }
              const subtitleFile = subtitle?.[0];
              await closeMainWindow();
              const args = ["--args"];
              const shellEscape = (str: string) => {
                return "'" + str.replace(/'/g, "'\\''") + "'";
              };
              if (subtitleFile) args.push(`--sub-file=${shellEscape(subtitleFile)}`);
              args.push(shellEscape(video));
              const quitVLC = `osascript -e 'quit app "VLC"'`;

              function launchVLC() {
                const cmd = `open -a VLC ${args.join(" ")}`;
                exec(cmd, handleVLCResult);
              }

              function handleVLCResult(error: Error | null) {
                let message = "VLC opened";
                if (error) message = "Failed to open VLC";
                else if (subtitleFile) message = "VLC opened with subtitle";
                showHUD(message);
              }

              function quitAndLaunch() {
                exec(quitVLC, () => {
                  setTimeout(launchVLC, 800);
                });
              }

              quitAndLaunch();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="video" title="Video File" allowMultipleSelection={false} />
      <Form.FilePicker id="subtitle" title="Subtitle File (Optional)" allowMultipleSelection={false} />
      <Form.Description
        title="Note"
        text="VLC must be quit before opening a file. This is a limitation of VLC on macOS: it only accepts new subtitle arguments when launched fresh."
      />
    </Form>
  );
}
