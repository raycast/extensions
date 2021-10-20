import { ActionPanel, Form, showHUD, showToast, SubmitFormAction, Toast, ToastStyle } from "@raycast/api";
import { exec } from "child_process";

export default function command() {
  function downloadVideo(values: { url: string; directory: string; playlist: number; format: string }) {
    if (values.directory == "") {
      var doPlaylist = () => {
        if (values.playlist == 0) return "";
        return "--no-playlist ";
      };
      const toast = new Toast({ style: ToastStyle.Animated, title: "Downloading", message: "Please wait..." });
      toast.show();
      exec(
        `cd "$HOME/Downloads"; youtube-dl ${doPlaylist()} -f ${
          values.format
        } --add-metadata --no-part  --xattrs --embed-thumbnail '${values.url}'`,
        (error, stdout) => {
          if (error) {
            toast.style = ToastStyle.Failure;
            if (error.message.includes("is not a valid URL.")) {
              toast.title = "Invalid URL";
              toast.message = "Please check your YouTube URL and try again";
            } else if (error.message.includes("command not found")) {
              toast.title = "Youtube-dl not found";
              toast.message = 'Run "brew install youtube-dl" to fix this issue.';
            } else if (error.message.includes("ffmpeg or avconv not found.")) {
              toast.title = "FFMPEG not found";
              toast.message = 'Run "brew install ffmpeg" to fix this issue.';
            } else {
              toast.title = "Error";
              toast.message = error.message;
            }
            return;
          } else {
            toast.style = ToastStyle.Success;
            toast.title = "Downloaded";
            toast.message = "Your video finished downloading";
          }
        }
      );
    } else {
      exec(`[ ! -d ${values.directory} ] && echo "false"`, (error, stdout, stderr) => {
        if (error)
          return showToast(ToastStyle.Failure, "Invalid Directory", "Please check the directory and try again.");

        if (stdout.includes("false"))
          return showToast(ToastStyle.Failure, "Invalid Directory", "Please check the directory and try again.");

        var doPlaylist = () => {
          if (values.playlist == 0) return "";
          return "--no-playlist ";
        };
        const toast = new Toast({ style: ToastStyle.Animated, title: "Downloading", message: "Please wait..." });
        toast.show();
        exec(
          `cd "${values.directory}"; youtube-dl ${doPlaylist()} -f ${
            values.format
          } --add-metadata --no-part  --xattrs --embed-thumbnail '${values.url}'`,
          (error, stdout) => {
            if (error) {
              if (error.message.includes("is not a valid URL.")) {
                toast.style = ToastStyle.Failure;
                toast.title = "Invalid URL";
                toast.message = "Please check your YouTube URL and try again";
              } else if (error.message.includes("command not found")) {
                toast.style = ToastStyle.Failure;
                toast.title = "Youtube-dl not found";
                toast.message = 'Run "brew install youtube-dl" to fix this issue.';
              } else {
                toast.style = ToastStyle.Failure;
                toast.title = "Error";
                toast.message = "A problem occured";
              }
              return;
            } else {
              toast.style = ToastStyle.Success;
              toast.title = "Downloaded";
              toast.message = "Your video finished downloading";
            }
          }
        );
      });
    }
    console.log(values);
  }

  return (
    <Form
      navigationTitle="youtube-dl"
      actions={
        <ActionPanel>
          <SubmitFormAction title="Start" onSubmit={downloadVideo} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://youtube.com/" />
      <Form.Dropdown id="format" title="Format">
        <Form.DropdownSection title="Video">
          <Form.DropdownItem title="MP4" value="mp4" />
          <Form.DropdownItem title="FLV" value="flv" />
          <Form.DropdownItem title="3GP" value="3gp" />
        </Form.DropdownSection>
        <Form.DropdownSection title="Audio">
          <Form.DropdownItem title="MP3" value="mp3" />
          <Form.DropdownItem title="M4A" value="m4a" />
          <Form.DropdownItem title="AAC" value="aac" />
          <Form.DropdownItem title="WAV" value="wav" />
          <Form.DropdownItem title="OGG" value="ogg" />
          <Form.DropdownItem title="WEBM" value="webm" />
        </Form.DropdownSection>
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox id="playlist" label="" title="Playlist" />
      <Form.TextField id="directory" title="Directory" placeholder="~/Downloads/" />
    </Form>
  );
}
