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
  const [sowBaseline, setSowBaseline] = useState("");
  const [features, setFeatures] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validateInputs(): {
    valid: boolean;
    parsedHours: number;
    parsedRate: number;
  } {
    const cleanHours = hours.replace(/,/g, "").trim();
    const cleanRate = rate.replace(/,/g, "").trim();
    const parsedHours = Number(cleanHours);
    const parsedRate = Number(cleanRate);

    if (
      !cleanHours ||
      !cleanRate ||
      !Number.isFinite(parsedHours) ||
      parsedHours <= 0 ||
      !Number.isFinite(parsedRate) ||
      parsedRate <= 0
    ) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter positive numbers for hours and hourly rate.",
      });
      return { valid: false, parsedHours: 0, parsedRate: 0 };
    }

    return { valid: true, parsedHours, parsedRate };
  }

  async function handleCopyReport() {
    const { valid, parsedHours, parsedRate } = validateInputs();
    if (!valid) return;

    const totalBleed = parsedHours * parsedRate;
    const formattedAmount = totalBleed.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const clientName = client.trim() || "Client Partner";

    const featureList = (
      features.trim() ||
      "Additional feature deliverables requested outside baseline."
    )
      .split(/[\r\n,]+/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .map((f) => `- ${f}`)
      .join("\n");

    const report = [
      "===============================================================",
      "SCOPELOCK — SCOPE CREEP AUDIT & EXPOSURE REPORT",
      "Master Services Agreement (MSA) Engineering Baseline Variance",
      "===============================================================",
      `CLIENT: ${clientName}`,
      sowBaseline.trim() ? `AGREED SOW BASELINE: ${sowBaseline.trim()}` : "",
      "",
      "UNBILLED SCOPE EXPANSION ITEMS:",
      featureList,
      "",
      `ESTIMATED VARIANCE: ${parsedHours} billable engineering hours @ $${parsedRate}/hr`,
      `TOTAL UNBILLED EXPOSURE: $${formattedAmount} USD`,
      "",
      "TERMS: Tasks identified above represent material expansion beyond the agreed project scope.",
      "Work is scheduled upon execution of a formal bilateral Change Order.",
      "===============================================================",
    ]
      .filter((line) => line !== "")
      .join("\n");

    await Clipboard.copy(report);
    await showToast({
      style: Toast.Style.Success,
      title: "Audit Report Copied!",
      message: `Total unbilled exposure: $${formattedAmount} USD`,
    });
  }

  async function handleAIAnalysis() {
    const { valid, parsedHours, parsedRate } = validateInputs();
    if (!valid) return;

    if (!environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI Not Available",
        message:
          "Raycast AI requires a Raycast Pro subscription. Using standard audit report.",
      });
      await handleCopyReport();
      return;
    }

    setIsLoading(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "AI Auditing Scope Creep...",
    });

    try {
      const clientName = client.trim() || "Client";
      const totalBleed = parsedHours * parsedRate;
      const formattedAmount = totalBleed.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

      const prompt = `You are an expert engineering contract auditor.
Review these incoming scope additions against the baseline and write a diplomatic, professional change-order response email.
Client: ${clientName}
Agreed Baseline Scope: ${sowBaseline.trim() || "Milestone deliverables agreed in statement of work."}
Requested New Features: ${features.trim() || "Additional customization and features."}
Estimated Effort: ${parsedHours} hours
Billing Rate: $${parsedRate}/hr
Total Added Cost: $${formattedAmount} USD

Provide:
1. Executive Scope Analysis (2-3 concise bullets)
2. Professional Change Order Negotiation Email ready to send to client.`;

      const aiResponse = await AI.ask(prompt);
      await Clipboard.copy(aiResponse);
      await showToast({
        style: Toast.Style.Success,
        title: "AI Scope Audit Copied to Clipboard!",
        message: "Professional change-order negotiation ready to send.",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Analysis Failed",
        message: "Falling back to standard audit report.",
      });
      await handleCopyReport();
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
            title="Copy Scope Exposure Audit"
            onSubmit={handleCopyReport}
          />
          {environment.canAccess(AI) && (
            <Action
              title="AI Scope Analysis & Draft"
              onAction={handleAIAnalysis}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="client"
        title="Client / Project Name"
        placeholder="e.g. Acme Digital Corp"
        value={client}
        onChange={setClient}
      />
      <Form.TextField
        id="sowBaseline"
        title="Agreed SOW Baseline (Optional)"
        placeholder="e.g. Standard Authentication & CRUD API as per contract"
        value={sowBaseline}
        onChange={setSowBaseline}
      />
      <Form.TextArea
        id="features"
        title="Unscoped Feature Requests"
        placeholder="e.g. Custom OAuth Integration, Real-time Webhooks, Export CSV"
        value={features}
        onChange={setFeatures}
      />
      <Form.TextField
        id="hours"
        title="Estimated Additional Hours"
        placeholder="e.g. 14"
        value={hours}
        onChange={setHours}
      />
      <Form.TextField
        id="rate"
        title="Billing Hourly Rate ($/hr)"
        placeholder="e.g. 125"
        value={rate}
        onChange={setRate}
      />
    </Form>
  );
}
