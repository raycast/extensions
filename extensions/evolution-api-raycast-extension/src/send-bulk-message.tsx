import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { sendTextMessage, checkWhatsAppNumbers } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  numbers: string; // comma or newline separated
  text: string;
  delayMs?: string;
  linkPreview: boolean;
  validateBeforeSend: boolean;
};

type NumberResult = {
  number: string;
  exists: boolean;
  jid?: string;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const isProcessingRef = useRef(false);

  const handleSubmit = useCallback(async (values: Values) => {
    // Prevent multiple simultaneous submissions
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsLoading(true);

    try {
      const delay = Math.max(0, Number(values.delayMs ?? 0));
      let numbers = values.numbers
        .split(/\n|,/) // split by newline or comma
        .map((s) => s.trim())
        .filter(Boolean);

      if (numbers.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No numbers provided" });
        return;
      }

      // Remove duplicates
      const uniqueNumbers = Array.from(new Set(numbers));
      numbers = uniqueNumbers;

      const lines: string[] = [];
      let success = 0;
      let failed = 0;
      let skipped = 0;
      let validatedNumbers = numbers;

      // Validate numbers if checkbox is enabled
      if (values.validateBeforeSend) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Validating numbers...",
          message: `Checking ${numbers.length} number${numbers.length !== 1 ? "s" : ""}`,
        });

        try {
          const validationResponse = (await checkWhatsAppNumbers(values.instanceName, numbers)) as NumberResult[];

          const validNumbers: string[] = [];
          const invalidNumbers: string[] = [];

          if (Array.isArray(validationResponse)) {
            validationResponse.forEach((item) => {
              if (item.exists) {
                validNumbers.push(item.number);
              } else {
                invalidNumbers.push(item.number);
                lines.push(`${item.number},SKIPPED,Not registered on WhatsApp`);
              }
            });
          }

          skipped = invalidNumbers.length;
          validatedNumbers = validNumbers;

          if (invalidNumbers.length > 0) {
            await showToast({
              style: Toast.Style.Animated,
              title: "Validation complete",
              message: `${validNumbers.length} valid, ${invalidNumbers.length} invalid (will be skipped)`,
            });
          }

          if (validNumbers.length === 0) {
            const summary = `No valid numbers found. Skipped: ${skipped}, Total: ${numbers.length}`;
            setReport(["number,status,message", ...lines, "", summary].join("\n"));
            await showToast({
              style: Toast.Style.Failure,
              title: "No valid numbers",
              message: "All numbers are invalid",
            });
            return;
          }
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation failed",
            message: "Proceeding without validation",
          });
          // Continue with all numbers if validation fails
        }
      }

      // Send messages to validated/all numbers
      const totalToSend = validatedNumbers.length;
      await showToast({
        style: Toast.Style.Animated,
        title: "Sending messages...",
        message: `Processing ${totalToSend} number${totalToSend !== 1 ? "s" : ""}`,
      });

      for (let i = 0; i < validatedNumbers.length; i++) {
        const num = validatedNumbers[i];
        try {
          await sendTextMessage({
            instanceName: values.instanceName,
            number: num,
            text: values.text,
            linkPreview: values.linkPreview,
          });
          success += 1;
          lines.push(`${num},OK`);
        } catch (e) {
          failed += 1;
          const msg = (e as { message?: string })?.message || "ERROR";
          lines.push(`${num},ERROR,${msg.replaceAll(",", " ")}`);
        }
        if (delay > 0 && i < validatedNumbers.length - 1) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      const summary = values.validateBeforeSend
        ? `Sent: ${success}, Failed: ${failed}, Skipped: ${skipped}, Total: ${numbers.length}`
        : `Sent: ${success}, Failed: ${failed}, Total: ${numbers.length}`;

      setReport(["number,status,message", ...lines, "", summary].join("\n"));
      await showToast({
        style: failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
        title: success > 0 ? "Bulk send complete" : "All messages failed",
        message: summary,
      });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Bulk send failed";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, []);

  if (isChecking) {
    return <Form isLoading={true} />;
  }

  if (!isValid) {
    return <Form isLoading={false} />;
  }

  return (
    <Form
      navigationTitle="Send Bulk WhatsApp Messages"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Bulk" icon={Icon.Airplane} onSubmit={handleSubmit} />
          {report ? (
            <Action
              title="Copy Report to Clipboard"
              icon={Icon.Clipboard}
              onAction={() => Clipboard.copy(report)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <InstanceDropdown
        instances={instances}
        isLoading={loadingInstances}
        info="No instance? Search for 'Create Instance' or 'Manage Instances' in Raycast"
      />
      <Form.TextArea
        id="numbers"
        title="Numbers"
        placeholder="One per line or comma-separated"
        info="Duplicate numbers will be automatically removed before sending"
      />
      <Form.TextArea id="text" title="Message" placeholder="Type your message" />
      <Form.TextField id="delayMs" title="Delay (ms) between messages" placeholder="e.g. 800" defaultValue="1000" />

      <Form.Separator />
      <Form.Description text="Additional Options" />

      <Form.Checkbox
        id="validateBeforeSend"
        label="Validate Numbers Before Sending"
        info="Check if numbers are registered on WhatsApp and skip invalid ones. This will add a validation step before sending."
        defaultValue={true}
        storeValue
      />

      <Form.Checkbox
        id="linkPreview"
        label="Enable Link Preview"
        info="Show preview for URLs in the message"
        defaultValue={false}
        storeValue
      />

      {report ? <Form.TextArea id="report" title="Report" value={report} enableMarkdown={false} /> : null}
    </Form>
  );
}
