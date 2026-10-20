export function parsePortlessListOutput(stdout: string): Array<string> {
  const urls: Array<string> = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    const match = line.match(/https?:\/\/[^\s]+/);
    if (match) {
      urls.push(match[0]);
    }
  }
  return urls;
}

export function describePortlessError(error: Error, executable: string): string {
  if (error.message.includes("ENOENT")) {
    return `Could not find ${executable}. Set Portless Executable in this extension's preferences.`;
  }
  if (error.message.includes("EACCES")) {
    return `${executable} is not executable. Pick a different file, or make it executable with chmod +x.`;
  }
  return error.message;
}
