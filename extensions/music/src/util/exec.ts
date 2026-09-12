import childProcess from "node:child_process";

export async function execute(file: string, ...args: string[]) {
  const child = childProcess.spawn(file, args, {
    timeout: 10_000,
    env: {
      PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      ...process.env,
    },
  });

  let output = "";
  for await (const chunk of child.stdout) {
    output += chunk;
  }

  let error = "";
  for await (const chunk of child.stderr) {
    error += chunk;
  }

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (exitCode) throw new Error(`Failed to execute command, exit-code: ${exitCode}, ${error}`);

  return output;
}
