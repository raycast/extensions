import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  const notice = `SCOPE DEFENSE NOTICE (Engineering Contract Standard):
"Any revisions, additions, or modifications exceeding the agreed Statement of Work (SOW) baseline represent additional scope. In accordance with standard Master Services Agreement terms, work on uncontracted deliverables requires an executed Change Order and budget schedule adjustment. Continued milestone delivery shall not constitute a waiver of baseline scope limits."`;

  await Clipboard.copy(notice);
  await showHUD("Scope Defense Notice Copied to Clipboard!");
}
