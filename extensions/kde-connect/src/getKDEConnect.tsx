import { Detail, environment } from "@raycast/api";

export default function GetKDEConnect() {
  const markdown = `## KDE Connect is Not Installed

![KDE Connect](${environment.assetsPath}/sc-apps-kdeconnect.png)

### Get the [KDE Connect For macOS nightly version](https://kdeconnect.kde.org/download.html)

And make sure it's installed to \`/Applications\`.
    `;

  return <Detail markdown={markdown} />;
}
