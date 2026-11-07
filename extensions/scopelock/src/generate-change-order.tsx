import React, { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  AI,
  environment,
} from "@raycast/api";

export default function Command() {
  const [client, setClient] = useState("");
  const [varianceTitle, setVarianceTitle] = useState("");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validateInputs(): {
    valid: boolean;
    parsedHours: number;
    parsedAmount: number;
  } {
    const cleanHours = hours.replace(/,/g, "").trim();
    const cleanAmount = amount.replace(/,/g, "").trim();
    const parsedHours = Number(cleanHours);
    const parsedAmount = Number(cleanAmount);

    if (
      !cleanHours ||
      !cleanAmount ||
      !Number.isFinite(parsedHours) ||
      parsedHours <= 0 ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter positive numbers for hours and total amount.",
      });
      return { valid: false, parsedHours: 0, parsedAmount: 0 };
    }

    return { valid: true, parsedHours, parsedAmount };
  }

  async function handleGenerate() {
    const { valid, parsedHours, parsedAmount } = validateInputs();
    if (!valid) return;

    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const formattedAmount = parsedAmount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const clientName = client.trim() || "Client Partner";
    const titleText = varianceTitle.trim() || "Engineering Scope Expansion";

    const changeOrderNotice = [
      "===============================================================",
      "FORMAL ENGINEERING CHANGE ORDER NOTICE",
      "Master Services Agreement (MSA) Scope Adjustment Notice",
      "===============================================================",
      `TO: ${clientName}`,
      `DATE: ${localDate}`,
      `CHANGE ORDER REF: CO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
      "",
      "DESCRIPTION OF SCOPE VARIANCE:",
      `The following deliverables ("${titleText}") represent a material expansion beyond the original Statement of Work (SOW) baseline.`,
      "",
      "COMMERCIAL ADJUSTMENT:",
      `- Additional Engineering Effort: ${parsedHours} billable hours`,
      `- Additional Milestone Budget: $${formattedAmount} USD`,
      "",
      "TERMS & SCHEDULE:",
      "Engineering implementation on these items will commence upon mutual written approval of this Change Order.",
      "Baseline milestone deliverables remain on track according to the primary agreement.",
      "===============================================================",
    ].join("\n");

    await Clipboard.copy(changeOrderNotice);
    await showToast({
      style: Toast.Style.Success,
      title: "Change Order Copied!",
      message: `Change order notice prepared for ${clientName}`,
    });
  }

  async function handleAIGenerate() {
    const { valid, parsedHours, parsedAmount } = validateInputs();
    if (!valid) return;

    if (!environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI Not Available",
        message:
          "Raycast AI requires a Raycast Pro subscription. Using standard change order template.",
      });
      await handleGenerate();
      return;
    }

    setIsLoading(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "AI Drafting Formal Change Order...",
    });

    try {
      const today = new Date();
      const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const formattedAmount = parsedAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      const clientName = client.trim() || "Client Partner";
      const titleText = varianceTitle.trim() || "Engineering Scope Expansion";

      const prompt = `You are a software engineering project manager and contract specialist.
Draft a professional, crystal-clear B2B Engineering Change Order document for client sign-off.
Client: ${clientName}
Date: ${localDate}
Scope Addition: ${titleText}
Hours: ${parsedHours} billable hours
Amount: $${formattedAmount} USD

Include:
- Formal Change Order Header & Reference Number
- Scope Breakdown & Impact Analysis
- Budget & Billing Schedule
- Sign-off / Acceptance Block for both parties.`;

      const aiResponse = await AI.ask(prompt);
      await Clipboard.copy(aiResponse);
      await showToast({
        style: Toast.Style.Success,
        title: "AI Change Order Copied!",
        message: "Formal change order agreement copied to clipboard.",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Generation Failed",
        message: "Falling back to standard template.",
      });
      await handleGenerate();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate & Copy Change Order"
            onSubmit={handleGenerate}
          />
          {environment.canAccess(AI) && (
            <Action
              title="AI Draft Detailed Change Order"
              onAction={handleAIGenerate}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="client"
        title="Client / Organization"
        placeholder="e.g. Enterprise Client Inc"
        value={client}
        onChange={setClient}
      />
      <Form.TextField
        id="varianceTitle"
        title="Scope Addition Deliverable"
        placeholder="e.g. Stripe Webhooks & Real-Time Sync"
        value={varianceTitle}
        onChange={setVarianceTitle}
      />
      <Form.TextField
        id="hours"
        title="Billable Effort (Hours)"
        placeholder="e.g. 8.5"
        value={hours}
        onChange={setHours}
      />
      <Form.TextField
        id="amount"
        title="Change Order Amount ($ USD)"
        placeholder="e.g. 1062"
        value={amount}
        onChange={setAmount}
      />
    </Form>
  );
}
