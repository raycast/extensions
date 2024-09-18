import { exec, spawn } from "child_process";
import { showToast, LocalStorage } from "@raycast/api";

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export default async () => {
  console.log("start");

  await playCycle();
};

let interval: NodeJS.Timer;
let tick = 0;

const playCycle = async () => {
  clearInterval(interval);
  tick = 0;

  const file = `raycast_gs_${randomIntFromInterval(0, 50)}.mp3`;

  showToast({
    title: "Buffering...",
  });

  await spawnAsync("curl", ["-O", `https://gs-raycast.s3.amazonaws.com/${file}`], { cwd: "/tmp" });

  LocalStorage.setItem("isPlaying", true);
  interval = setInterval(() => {
    tick++;
    console.log(tick);
    LocalStorage.getItem("isPlaying").then((value) => {
      if (!value) {
        clearInterval(interval);
      }
    });
  }, 1000);
  await execAsync(`afplay /tmp/${file}`);

  // await playCycle();
};

const execAsync = (command: string, options?: any) => {
  return new Promise<void>((resolve) => {
    exec(command, options, (err, stdout) => {
      console.log(err);
      console.log(stdout);

      if (!err) {
        resolve();
      }
    });
  });
};

const spawnAsync = (command: string, args: any, options?: any) => {
  return new Promise<void>((resolve) => {
    const child = spawn(command, args, options);
    // .on("error", console.log)
    // .on("message", console.log);

    child.stdout.on("data", (data) => {
      console.log(`stdout:\n${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on("error", (error) => {
      console.error(`error: ${error.message}`);
    });

    child.on("close", (code) => {
      resolve();
    });
  });
};
