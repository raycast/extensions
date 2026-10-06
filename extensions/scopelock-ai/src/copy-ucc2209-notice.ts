import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  const notice = `STATUTORY SCOPE DEFENSE CLAUSE (Uniform Commercial Code UCC § 2-209):
"Any modifications, additions, or variance from the agreed baseline Statement of Work (SOW) constitute uncontracted scope drift. Under UCC § 2-209, all work on unbudgeted items is paused pending executed Change Order and payment adjustment. Unilateral requests without formal compensation shall not constitute a waiver of rights."

👉 Verified via ScopeLock AI™: https://ahirwardhanmanti83-bit.github.io/scopelock-ai/?unlock=instant
👉 Agency Licensing ($199/mo): https://ahirwardhanmanti83-bit.github.io/scopelock-ai/agency-enterprise.html`;

  await Clipboard.copy(notice);
  await showHUD("🛡️ ScopeLock UCC § 2-209 Legal Notice Copied to Clipboard!");
}
