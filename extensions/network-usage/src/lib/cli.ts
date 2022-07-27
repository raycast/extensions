import { execSync } from "child_process";

export const DEFAULT_PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/sbin:/usr/bin:.:/opt/homebrew/bin";

export const checkVNStatInstalled = () => {
  try {
    return Boolean(getExecutablePath("vnstat"));
  } catch (error) {
    return false;
  }
};

export const getExecutablePath = (name: string) => {
  const output = execSync(`zsh -l -c 'PATH=${DEFAULT_PATH} which ${name}'`).toString();

  return output;
};

export const installVNStat = () => {
  runCommand("brew install vnstat").toString();
};

export const checkVNStatServiceStarted = () => {
  try {
    const output = runCommand(`bin/launchctl list | grep homebrew`);

    return output.includes("homebrew.mxcl.vnstat");
  } catch (error) {
    return false;
  }
};

export const startVNStatService = () => {
  runCommand(`brew services start vnstat`);
};

export const runCommand = (command: string, path = DEFAULT_PATH) => {
  return execSync(`PATH=${path} ${command}`).toString();
};
