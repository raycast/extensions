import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { generateMultipleCPFs, unmaskCPF } from "./lib/generators/cpf";
import { BRAZILIAN_STATES, MAX_BATCH_GENERATION } from "./lib/constants";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";
import { formatBatch, formatDocumentForExport } from "./lib/utils/formatter";
import { addToHistory } from "./lib/storage/history";
import { CPFFormValues, PreferencesType } from "./types";

export default function GenerateCPF() {
  const preferences = getPreferenceValues<PreferencesType>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CPFFormValues) {
    setIsLoading(true);

    try {
      const quantity = Math.min(parseInt(values.quantity) || 1, MAX_BATCH_GENERATION);

      const cpfs = generateMultipleCPFs({
        state: values.state,
        masked: values.masked,
        quantity,
      });

      if (quantity === 1) {
        const cpf = cpfs[0];
        const action = preferences.primaryAction || "copy";

        if (action === "paste") {
          await pasteToFrontmostApp(cpf);
        } else {
          await copyToClipboard(cpf, "CPF copied successfully");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "CPF",
            value: unmaskCPF(cpf),
            masked: cpf,
            metadata: { state: values.state || "Any" },
          });
        }
      } else {
        const documents = cpfs.map((cpf) =>
          formatDocumentForExport("CPF", unmaskCPF(cpf), cpf, { state: values.state || "Any" }),
        );

        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} CPFs copied successfully`);

        if (preferences.enableHistory) {
          for (const cpf of cpfs.slice(0, 10)) {
            await addToHistory({
              type: "CPF",
              value: unmaskCPF(cpf),
              masked: cpf,
              metadata: { state: values.state || "Any" },
            });
          }
        }
      }
    } catch (error) {
      await showFailureToast(error, { title: "Error generating CPF" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Cpf" icon={Icon.Person} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="state" title="State of Origin" defaultValue="">
        {BRAZILIAN_STATES.map((state) => (
          <Form.Dropdown.Item key={state.value} value={state.value} title={state.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="masked"
        label="With formatting (XXX.XXX.XXX-XX)"
        defaultValue={preferences.defaultMask !== false}
      />

      <Form.TextField
        id="quantity"
        title="Quantity"
        placeholder="1"
        defaultValue={preferences.defaultQuantity || "1"}
        info={`Maximum: ${MAX_BATCH_GENERATION} items`}
      />
    </Form>
  );
}
