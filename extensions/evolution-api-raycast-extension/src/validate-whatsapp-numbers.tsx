import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, Color, List } from "@raycast/api";
import { useState } from "react";
import { checkWhatsAppNumbers } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  numbers: string;
};

type NumberResult = {
  number: string;
  exists: boolean;
  jid?: string;
};

type ValidationResult = {
  valid: NumberResult[];
  invalid: NumberResult[];
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  if (isChecking) return <Form isLoading={true} />;
  if (!isValid) return <Form isLoading={false} />;

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    setResult(null);
    try {
      const nums = values.numbers
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (nums.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No numbers provided" });
        setIsLoading(false);
        return;
      }

      // Remove duplicates by using a Set
      const uniqueNums = Array.from(new Set(nums));
      const duplicateCount = nums.length - uniqueNums.length;

      if (duplicateCount > 0) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Removed ${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""}`,
          message: `Processing ${uniqueNums.length} unique numbers`,
        });
      }

      const response = (await checkWhatsAppNumbers(values.instanceName, uniqueNums)) as NumberResult[];

      // Process the response to separate valid and invalid numbers
      const valid: NumberResult[] = [];
      const invalid: NumberResult[] = [];

      // Check if response is an array
      if (Array.isArray(response)) {
        response.forEach((item) => {
          if (item.exists) {
            valid.push(item);
          } else {
            invalid.push(item);
          }
        });
      } else {
        // Handle unexpected response format
        console.error("Unexpected response format:", response);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unexpected response format",
          message: "Check console for details",
        });
        setIsLoading(false);
        return;
      }

      setResult({ valid, invalid });

      await showToast({
        style: Toast.Style.Success,
        title: "Validation complete",
        message: `Valid: ${valid.length}, Invalid: ${invalid.length}`,
      });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to validate numbers";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  async function copyValidNumbers() {
    if (!result) return;
    const numbers = result.valid.map((item) => item.number).join("\n");
    await Clipboard.copy(numbers);
    await showToast({
      style: Toast.Style.Success,
      title: "Valid numbers copied",
      message: `${result.valid.length} number${result.valid.length !== 1 ? "s" : ""} copied to clipboard`,
    });
  }

  async function copyInvalidNumbers() {
    if (!result) return;
    const numbers = result.invalid.map((item) => item.number).join("\n");
    await Clipboard.copy(numbers);
    await showToast({
      style: Toast.Style.Success,
      title: "Invalid numbers copied",
      message: `${result.invalid.length} number${result.invalid.length !== 1 ? "s" : ""} copied to clipboard`,
    });
  }

  async function copyAllResults() {
    if (!result) return;
    const output = [
      "=== VALID NUMBERS ===",
      ...result.valid.map((item) => `${item.number}${item.jid ? ` (${item.jid})` : ""}`),
      "",
      "=== INVALID NUMBERS ===",
      ...result.invalid.map((item) => item.number),
      "",
      `Summary: ${result.valid.length} valid, ${result.invalid.length} invalid`,
    ].join("\n");
    await Clipboard.copy(output);
    await showToast({
      style: Toast.Style.Success,
      title: "Full report copied",
      message: "Complete validation report copied to clipboard",
    });
  }

  if (result) {
    return (
      <List navigationTitle="WhatsApp Number Validation Results" searchBarPlaceholder="Search numbers...">
        <List.Section title="Summary" subtitle={`${result.valid.length + result.invalid.length} numbers checked`}>
          <List.Item
            title="Valid Numbers"
            subtitle={`${result.valid.length} number${result.valid.length !== 1 ? "s" : ""} registered on WhatsApp`}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            accessories={[{ text: `${result.valid.length}`, icon: Icon.Person }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy All Valid Numbers"
                  icon={Icon.Clipboard}
                  onAction={copyValidNumbers}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
                <Action
                  title="Copy All Results"
                  icon={Icon.Document}
                  onAction={copyAllResults}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
                <Action
                  title="Copy All Invalid Numbers"
                  icon={Icon.Clipboard}
                  onAction={copyInvalidNumbers}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action
                  title="Check Again"
                  icon={Icon.RotateClockwise}
                  onAction={() => setResult(null)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Invalid Numbers"
            subtitle={`${result.invalid.length} number${result.invalid.length !== 1 ? "s" : ""} not on WhatsApp`}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            accessories={[{ text: `${result.invalid.length}`, icon: Icon.PersonCircle }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy All Invalid Numbers"
                  icon={Icon.Clipboard}
                  onAction={copyInvalidNumbers}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action
                  title="Copy All Results"
                  icon={Icon.Document}
                  onAction={copyAllResults}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
                <Action
                  title="Copy All Valid Numbers"
                  icon={Icon.Clipboard}
                  onAction={copyValidNumbers}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
                <Action
                  title="Check Again"
                  icon={Icon.RotateClockwise}
                  onAction={() => setResult(null)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        {result.valid.length > 0 && (
          <List.Section title="Valid WhatsApp Numbers" subtitle={`${result.valid.length} found`}>
            {result.valid.map((item, index) => (
              <List.Item
                key={`valid-${index}`}
                title={item.number}
                subtitle={item.jid || ""}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={[{ text: "Active", icon: Icon.Checkmark }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Number"
                      content={item.number}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {item.jid && (
                      <Action.CopyToClipboard
                        title="Copy JID"
                        content={item.jid}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                    <Action
                      title="Copy All Valid Numbers"
                      icon={Icon.Clipboard}
                      onAction={copyValidNumbers}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                    />
                    <Action
                      title="Copy All Results"
                      icon={Icon.Document}
                      onAction={copyAllResults}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {result.invalid.length > 0 && (
          <List.Section title="Invalid Numbers" subtitle={`${result.invalid.length} not on WhatsApp`}>
            {result.invalid.map((item, index) => (
              <List.Item
                key={`invalid-${index}`}
                title={item.number}
                subtitle="Not registered on WhatsApp"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                accessories={[{ text: "Not Found", icon: Icon.XMarkCircle }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Number"
                      content={item.number}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy All Invalid Numbers"
                      icon={Icon.Clipboard}
                      onAction={copyInvalidNumbers}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                    <Action
                      title="Copy All Results"
                      icon={Icon.Document}
                      onAction={copyAllResults}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Validate WhatsApp Numbers"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Validate Numbers" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextArea
        id="numbers"
        title="Phone Numbers"
        placeholder="Enter numbers (one per line or comma-separated)&#10;Example:&#10;55999999999&#10;11988887777&#10;21977776666"
        info="Enter phone numbers without special characters or spaces. Duplicates will be automatically removed."
      />
      <Form.Description text="💡 Tip: Duplicates are automatically filtered. After validation, you can copy valid or invalid numbers separately." />
    </Form>
  );
}
