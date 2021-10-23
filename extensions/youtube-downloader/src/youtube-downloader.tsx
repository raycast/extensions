import { ActionPanel, Detail, Form, SubmitFormAction, Toast, ToastStyle, useNavigation } from "@raycast/api";
import { spawn } from "child_process";

export default function command() {
  // Will be removed after issue#170 is fixed
  process.env.PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

  const { push } = useNavigation();
  // Download video handler
  function downloadVideo(values: { url: string; directory: string; playlist: number; format: string }) {
    var args = [];
    // File specific arguments
    switch (values.format) {
      case "webm":
        args.push("-f", "webm");
        break;
      case "mp3":
        args.push("--extract-audio", "--audio-format", "mp3", "--add-metadata", "--xattrs", "--embed-thumbnail");
        break;
      case "m4a":
        args.push("--extract-audio", "--audio-format", "m4a", "--add-metadata", "--xattrs", "--embed-thumbnail");
        break;
      case "wav":
        args.push("--extract-audio", "--audio-format", "wav");
        break;
      case "aac":
        args.push("--extract-audio", "--audio-format", "aac");
        break;
      case "mp4":
        args.push(
          "-f",
          "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
          "--no-part",
          "--embed-subs",
          "--add-metadata",
          "--xattrs",
          "--embed-thumbnail"
        );
        break;
      case "mkv":
        args.push("--recode-video", "mkv");
        break;
      case "avi":
        args.push("--recode-video", "avi");
        break;
      case "description":
        args.push("--write-description", "--skip-download", "--youtube-skip-dash-manifest");
        break;
      case "thumbnail":
        args.push("--write-thumbnail", "--skip-download");
        break;
      default:
        break;
    }
    // Handle directory
    var dir;
    if (values.directory == "") {
      dir = `~/Downloads/%(title)s-%(id)s.%(ext)s`;
    } else if (values.directory.endsWith("/")) {
      dir = `'${values.directory}%(title)s-%(id)s.%(ext)s'`;
    } else {
      dir = `'${values.directory}/%(title)s-%(id)s.%(ext)s'`;
    }
    if ((values.playlist = 1)) {
      args.push("--yes-playlist");
    } else {
      args.push("--no-playlist");
    }
    args.push("-o", dir, values.url);
    const toast = new Toast({ style: ToastStyle.Animated, title: "Downloading", message: "Spawning process" });
    toast.show();
    // Execute download command
    console.log("Downloading with arguments: ", args);
    const videoDownload = spawn("wrong-dl", args);
    videoDownload.stdout.on("data", (data) => {
      const stdout: string = data.toString();
      if (stdout.includes("[download]")) {
        toast.message = "Receiving video: " + stdout.split("[download]")[1].split("of")[0].trim();
      } else if (stdout.includes("Writing thumbnail")) {
        toast.message = "Processing thumbnail";
      } else if (stdout.includes("Downloading thumbnail")) {
        toast.message = "Receiving thumbnail";
      } else if (stdout.includes("Downloading webpage")) {
        toast.message = "Receiving video information";
      } else if (stdout.includes("[ffmpeg] Destination:")) {
        toast.message = "FFmpeg processing";
      } else if (stdout.includes("Deleting original file")) {
        toast.message = "Cleaning up";
      }
      console.log(`stdout: ${stdout}`);
    });
    videoDownload.stderr.on("data", (data: string) => {
      toast.style = ToastStyle.Failure;
      toast.title = "Error";
      if (data.includes("nodename nor servname provided, or not known")) {
        toast.message = "No internet connection";
      } else if (data.includes("unable to download video data: HTTP Error 403: Forbidden")) {
        toast.message = "Connection refused";
      } else if (data.includes("ffprobe or avprobe not found. Please install one.")) {
        toast.message = "FFmpeg not found. Please visit ffmpeg.org";
      } else if (data.includes("AtomicParsley was not found. Please install.")) {
        toast.message = "AtomicParsley not found. Please install.";
      } else {
        toast.message = data.toString();
        console.error(`stderr: ${data}`);
      }
    });

    videoDownload.on("close", (code: number) => {
      if (code == 0) {
        toast.style = ToastStyle.Success;
        toast.title = "Complete";
        toast.message = "Download finished";
      }
      console.log(`child process exited with code ${code}`);
    });

    videoDownload.on("error", (err: Error) => {
      if (err.message.includes("ENOENT")) {
        // try to install youtube-dl
        toast.style = ToastStyle.Failure;
        toast.title = "Youtube-dl Not Found";
        toast.message = "A utility should help you install dependencies";
        push(<InstallScreen />);
      } else {
        toast.style = ToastStyle.Failure;
        toast.title = "Error";
        toast.message = err.message;
        console.error(err);
      }
    });
    videoDownload.on("spawn", () => {
      toast.message = "Establishing connection";
    });
  }
  //rendering
  return (
    <Form
      navigationTitle="Youtube Downloader"
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
          <Form.DropdownItem title="MKV" value="mkv" />
          <Form.DropdownItem title="AVI" value="avi" />
        </Form.DropdownSection>
        <Form.DropdownSection title="Audio">
          <Form.DropdownItem title="MP3" value="mp3" />
          <Form.DropdownItem title="M4A" value="m4a" />
          <Form.DropdownItem title="AAC" value="aac" />
          <Form.DropdownItem title="WAV" value="wav" />
          <Form.DropdownItem title="WEBM" value="webm" />
        </Form.DropdownSection>
        <Form.DropdownSection title="Misc">
          <Form.DropdownItem title="Thumbnail" value="thumbnail" />
          <Form.DropdownItem title="Description" value="description" />
        </Form.DropdownSection>
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox id="playlist" label="" title="Playlist" />
      <Form.TextField id="directory" title="Directory" placeholder="~/Downloads/" />
    </Form>
  );
}

function InstallScreen() {
  const { push } = useNavigation();
  function install() {
    push(<InstallingScreen />);
    const dlInstall = spawn("sh", [__dirname + "/assets/install.sh"]);
    dlInstall.stdout.on("data", (data) => {
      console.log("[DL Install]: ", data.toString());
    });
    dlInstall.stderr.on("data", (data) => {
      console.log("[DL Install]: ", data.toString());
    });
    dlInstall.on("error", (err) => {
      console.log(err);
    });
    dlInstall.on("exit", (code: number) => {
      installInfo.props.isLoading = false;
      if (code == 0) {
        const installSuccess = new Toast({
          style: ToastStyle.Success,
          title: "Success",
          message: "You can start using YouTube Downloader now",
        });
        installSuccess.show();
      } else {
        const installSuccess = new Toast({
          style: ToastStyle.Failure,
          title: "Failure",
          message: "You can still manuelly install from youtube-dl.org",
        });
        installSuccess.show();
      }
    });
  }
  const installInfo = (
    <Detail
      navigationTitle="Install Dependencies"
      isLoading={false}
      markdown="# Installing Dependencies
You need to install some tools for YouTube Downloader to work. By clicking continue or enter, the following three packages will be automatically installed:
- Brew
- Youtube-dl
- FFmpeg"
      actions={
        <ActionPanel title="Continue">
          <ActionPanel.Item title="Continue" onAction={install} />
        </ActionPanel>
      }
    ></Detail>
  );
  return installInfo;
}

function InstallingScreen() {
  const installInfo = (
    <Detail
      navigationTitle="Install Dependencies"
      isLoading={true}
      markdown="# Installing Dependencies
You need to install some tools for YouTube Downloader to work. By clicking continue or enter, the following three packages will be automatically installed:
- Brew
- Youtube-dl
- FFmpeg"
      actions={
        <ActionPanel title="Continue">
          <ActionPanel.Item title="Continue" />
        </ActionPanel>
      }
    ></Detail>
  );
  return installInfo;
}
