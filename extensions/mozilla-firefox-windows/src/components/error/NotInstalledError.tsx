import { Detail } from "@raycast/api";

const DownloadText = `
# 🚨Error: Mozilla Firefox browser is not installed
## This extension depends on Mozilla Firefox browser. You must install it to continue.

[Click here](https://www.mozilla.org/en-US/firefox/new/) to download Mozilla Firefox manually.

[![Mozilla Firefox](https://mozilla.design/files/2019/10/logo-firefox.svg)]()
`;

export function NotInstalledError() {
  return <Detail markdown={DownloadText} />;
}
