import { Detail, environment } from "@raycast/api";

export default function GetKDEConnect() {
  const markdown = `## KDE Connect is Not Installed

![KDE Connect](${environment.assetsPath}/sc-apps-kdeconnect.png)

### Get it from the [KDE Binary Factory](https://binary-factory.kde.org/view/MacOS/job/kdeconnect-kde_Nightly_macos/)

And make sure it's installed to \`/Applications\`.
    `;

  return <Detail markdown={markdown} />;
}
