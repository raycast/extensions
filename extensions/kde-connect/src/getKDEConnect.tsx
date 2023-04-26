import { Detail } from "@raycast/api";

export default function GetKDEConnect() {
  const markdown = `# KDE Connect is Not Installed
Get it from the [KDE Binary Factory](https://binary-factory.kde.org/view/MacOS/job/kdeconnect-kde_Nightly_macos/)
    `;

  return <Detail markdown={markdown} />;
}
