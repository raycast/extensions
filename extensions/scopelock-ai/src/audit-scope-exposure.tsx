import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";

export default function Command() {
  const [hours, setHours] = useState("14");
  const [rate, setRate] = useState("125");
  const [client, setClient] = useState("Acme Digital Corp");
  const [features, setFeatures] = useState("Custom OAuth Integration, Automated Webhook Alerts, Export CSV");

  const totalBleed = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  async function handleSubmit() {
    const report = `===============================================================
🛡️ SCOPELOCK AI — STATUTORY SCOPE CREEP AUDIT REPORT
Uniform Commercial Code (UCC § 2-209) Enforceable Variance
===============================================================

CLIENT: ${client}
UNBILLED FEATURES DETECTED:
- ${features.split(",").map(f => f.trim()).join("\n- ")}

ESTIMATED VARIANCE: ${hours} hours @ $${rate}/hr
TOTAL UNBILLED AMOUNT: $${totalBleed.toLocaleString()} USD

LEGAL STATUS: Uncontracted scope variance. Work is paused under UCC § 2-209 pending formal signed Change Order.

👉 INSTANT RATIFICATION & EXECUTION ($3 USD / $199 PRO):
Web: https://ahirwardhanmanti83-bit.github.io/scopelock-ai/?unlock=instant
Patreon: https://patreon.com/c/scopelock
Payoneer Direct: ahirwardhanmanti83@gmail.com
===============================================================`;

    await Clipboard.copy(report);
    await showToast({
      style: Toast.Style.Success,
      title: "Audit Report Copied!",
      message: `Total unbilled variance: $${totalBleed.toLocaleString()} USD`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Legal Audit Report" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Unlock Statutory Enforcement ($3 Instant / $199 Pro)"
            url="https://ahirwardhanmanti83-bit.github.io/scopelock-ai/?unlock=instant"
          />
          <Action.OpenInBrowser
            title="Agency Enterprise Shield ($199/mo)"
            url="https://ahirwardhanmanti83-bit.github.io/scopelock-ai/agency-enterprise.html"
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="client" title="Client Name" value={client} onChange={setClient} />
      <Form.TextArea id="features" title="Unscoped Feature Requests" value={features} onChange={setFeatures} />
      <Form.TextField id="hours" title="Estimated Unbilled Hours" value={hours} onChange={setHours} />
      <Form.TextField id="rate" title="Billing Hourly Rate ($/hr)" value={rate} onChange={setRate} />
    </Form>
  );
}
