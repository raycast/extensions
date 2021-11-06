import { Detail } from "@raycast/api";

export function SpeedTestHelp(): JSX.Element {
  return (
    <Detail
      markdown={`# Speedtest CLI is not installed

  This command needs the Speedtest.net CLI installed on your machine.

  Install via homebrew

  ~~~
  brew tap teamookla/speedtest
  brew update
  brew install speedtest --force
  ~~~

  After the installation run \`speedtest\`. You need to answer the license questions with \`YES\` otherwise the CLI tool would not run.

  Checkout the [official Speedtest.net CLI docs](https://www.speedtest.net/de/apps/cli) about the installing process.
  
  Restart this command after a successful installation.
  `}
    />
  );
}
