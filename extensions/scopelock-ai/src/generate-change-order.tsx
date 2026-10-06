import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";

export default function Command() {
  const [client, setClient] = useState("Enterprise Client Inc");
  const [varianceTitle, setVarianceTitle] = useState("Stripe Webhooks & Real-Time Sync");
  const [hours, setHours] = useState("8.5");
  const [amount, setAmount] = useState("1062");

  async function handleGenerate() {
    const cleanHours = hours.replace(/,/g, "").trim();
    const cleanAmount = amount.replace(/,/g, "").trim();
    const parsedHours = Number(cleanHours);
    const parsedAmount = Number(cleanAmount);

    if (!Number.isFinite(parsedHours) || parsedHours <= 0 || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter positive finite numbers for hours and amount.",
      });
      return;
    }

    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const formattedAmount = parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const changeOrderNotice = [
      "===============================================================",
      "FORMAL CONTRACT AMENDMENT & STATUTORY NOTICE",
      "Uniform Commercial Code (UCC § 2-209) — Valid Modification",
      "===============================================================",
      `TO: ${client}`,
      "FROM: ScopeLock AI Autonomous Defense Engine",
      `DATE: ${localDate}`,
      "",
      "NOTICE OF CONTRACT VARIANCE:",
      `The engineering tasks requested ("${varianceTitle}") constitute a material expansion of the baseline Statement of Work (SOW).`,
      "",
      "Under UCC § 2-209, modifications that introduce unbudgeted engineering hours require formal bilateral consideration or written ratification.",
      "",
      `- Additional Estimated Effort: ${parsedHours} billable hours`,
      `- Commercial Variance Amount: $${formattedAmount} USD`,
      "",
      "ACTION REQUIRED:",
      "Engineering commits on this branch are paused. Please authorize and execute the formal Change Order ratification.",
      "===============================================================",
    ].join("\n");

    await Clipboard.copy(changeOrderNotice);
    await showToast({
      style: Toast.Style.Success,
      title: "UCC § 2-209 Change Order Copied!",
      message: `Bilateral variance notice prepared for ${client}`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate & Copy Change Order Notice" onSubmit={handleGenerate} />
          <Action.OpenInBrowser
            title="Unlock Direct Legal Ratification ($3 Instant)"
            url="https://ahirwardhanmanti83-bit.github.io/scopelock-ai/?unlock=instant"
          />
          <Action.OpenInBrowser
            title="Agency Enterprise SOW Defense ($199/mo)"
            url="https://ahirwardhanmanti83-bit.github.io/scopelock-ai/agency-enterprise.html"
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="client" title="Client / Organization" value={client} onChange={setClient} />
      <Form.TextField id="varianceTitle" title="Scope Creep Feature" value={varianceTitle} onChange={setVarianceTitle} />
      <Form.TextField id="hours" title="Billable Variance Hours" value={hours} onChange={setHours} />
      <Form.TextField id="amount" title="Statutory Amount ($ USD)" value={amount} onChange={setAmount} />
    </Form>
  );
}
