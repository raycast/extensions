import { spawn, ChildProcess } from "node:child_process";

const playingProcesses: Map<string, ChildProcess> = new Map();

function stopPreviousPlayback(absolutePath: string): void {
  if (playingProcesses.has(absolutePath)) {
    const previousProcess = playingProcesses.get(absolutePath);
    previousProcess?.kill();
    playingProcesses.delete(absolutePath);
  }
}

function startPlay(absolutePath: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const process = spawn("afplay", ["-v", "0.1", absolutePath]);
    playingProcesses.set(absolutePath, process);

    process.on("exit", () => {
      const previousProcess = playingProcesses.get(absolutePath);
      if (previousProcess === process) playingProcesses.delete(absolutePath);
      resolve();
    });
  });
}

async function play(filePath: string): Promise<void> {
  try {
    stopPreviousPlayback(filePath);
    await startPlay(filePath);
  } catch {
    throw new Error("Failed to play audio");
  }
}

export default { play };
