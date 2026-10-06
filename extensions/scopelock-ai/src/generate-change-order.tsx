import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";

export default function Command() {
  const [client, setClient] = useState("Enterprise Client Inc");
  const [varianceTitle, setVarianceTitle] = useState("Stripe Webhooks & Real-Time Sync");
  const [hours, setHours] = useState("8.5");
  const [amount, setAmount] = useState("1062");

  async function handleGenerate() {
    const today = new Date();
    const localDate = ;

    const changeOrderNotice = ;

    await Clipboard.copy(changeOrderNotice);
    await showToast({
      style: Toast.Style.Success,
      title: "UCC § 2-209 Change Order Copied!",
      message: ,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate & Copy Change Order Notice" onSubmit={handleGenerate} />
          <Action.OpenInBrowser
            title="Unlock Direct Legal Ratification ( Instant)"
            url="https://ahirwardhanmanti83-bit.github.io/scopelock-ai/?unlock=instant"
          />
          <Action.OpenInBrowser
            title="Agency Enterprise SOW Defense (99/mo)"
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
