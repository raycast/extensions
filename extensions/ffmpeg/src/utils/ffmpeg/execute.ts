import { execSync, spawn } from "child_process";
import stripAnsi from "strip-ansi";

export function getFFmpegPath() {
  const commandFolderPath = execSync(`
  locations=(
      /usr/local/bin
      /usr/bin
      /bin
      /usr/sbin
      /sbin
      /opt/X11/bin
      /opt/homebrew/bin
      /usr/local/Cellar
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location/ffmpeg" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
`)
    .toString()
    .trim();

  if (commandFolderPath) {
    return commandFolderPath.replace(/\n/gi, "") + "/ffmpeg";
  }
  return "";
}

export function isFFmpegInstalled() {
  return !!getFFmpegPath();
}

export function getFFprobePath() {
  return (
    execSync(`
  locations=(
      /usr/local/bin
      /usr/bin
      /bin
      /usr/sbin
      /sbin
      /opt/X11/bin
      /opt/homebrew/bin
      /usr/local/Cellar
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location/ffprobe" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
`)
      .toString()
      .trim()
      .replace(/\n/gi, "") + "/ffprobe"
  );
}

export function executeFFmpegCommand(command: string) {
  return execSync(`${getFFmpegPath()} ${command}`).toString();
}

export function executeFFprobeCommand(command: string) {
  return execSync(`${getFFprobePath()} ${command}`).toString();
}

export function executeFFmpegCommandAsync({
  command,
  onContent,
}: {
  command: string;
  onContent?: (content: string) => void;
}) {
  return new Promise((resolve) => {
    const child = spawn(`${getFFmpegPath()} ${command}`, { shell: true });
    if (onContent) {
      child.stdout.on("data", (data) => {
        onContent(stripAnsi(data.toString()));
      });

      child.stderr.on("data", (data) => {
        onContent(stripAnsi(data.toString()));
      });
    }

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}

export function executeFFprobeCommandAsync({
  command,
  onContent,
}: {
  command: string;
  onContent: (content: string) => void;
}) {
  return new Promise((resolve) => {
    const child = spawn(`${getFFprobePath()} ${command}`, { shell: true });
    child.stdout.on("data", (data) => {
      onContent(stripAnsi(data.toString()));
    });

    child.stderr.on("data", (data) => {
      onContent(stripAnsi(data.toString()));
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}
