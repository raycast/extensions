import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";

export default function Command() {
  const [hours, setHours] = useState("14");
  const [rate, setRate] = useState("125");
  const [client, setClient] = useState("Acme Digital Corp");
  const [features, setFeatures] = useState("Custom OAuth Integration\nAutomated Webhook Alerts\nExport CSV");

  const parsedHours = parseFloat(hours) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const totalBleed = parsedHours * parsedRate;

  async function handleSubmit() {
    if (parsedHours <= 0 || parsedRate <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter valid positive numbers for hours and rate.",
      });
      return;
    }

    const formattedAmount = totalBleed.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const featureList = features
      .split(/[\r\n,]+/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .map((f) => `- ${f}`)
      .join("\n");

    const report = [
      "===============================================================",
      "SCOPELOCK AI — STATUTORY SCOPE CREEP AUDIT REPORT",
      "Uniform Commercial Code (UCC § 2-209) Enforceable Variance",
      "===============================================================",
      `CLIENT: ${client}`,
      "UNBILLED FEATURES DETECTED:",
      featureList,
      "",
      `ESTIMATED VARIANCE: ${parsedHours} hours @ $${parsedRate}/hr`,
      `TOTAL UNBILLED AMOUNT: $${formattedAmount} USD`,
      "",
      "LEGAL STATUS: Uncontracted scope variance. Work is paused under UCC § 2-209 pending formal signed Change Order.",
      "===============================================================",
    ].join("\n");

    await Clipboard.copy(report);
    await showToast({
      style: Toast.Style.Success,
      title: "Audit Report Copied!",
      message: `Total unbilled variance: $${formattedAmount} USD`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Legal Audit Report" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Unlock Statutory Enforcement ($3 Instant)"
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
