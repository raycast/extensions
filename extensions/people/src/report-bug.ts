import { open } from "@raycast/api";

const subject = "People Raycast Bug Report";
const body = `What happened?

Steps to reproduce:

Expected result:

macOS version:

Please do not include contact exports, credentials, or sensitive contact details.`;

export default async function ReportBug() {
  const url = `mailto:support@supersimplecontacts.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  await open(url);
}
