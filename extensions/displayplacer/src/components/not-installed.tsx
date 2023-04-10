import { Detail } from "@raycast/api";
import { AutoInstall } from "./autoInstall";

export default function NotInstalled({
  onRefresh = () => {
    return;
  },
}) {
  return (
    <Detail
      actions={<AutoInstall onRefresh={onRefresh} />}
      markdown={`
# 🚨 Error: Displayplacer Utility is not installed
This extension depends on a command-line utilty that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you.

To install homebrew, visit [this link](https://brew.sh)

Or, to install displayplacer manually, [click here](https://github.com/jakehilborn/displayplacer).
  `}
    />
  );
}
