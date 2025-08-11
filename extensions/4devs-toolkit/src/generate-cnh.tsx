import { Action, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { generateMultipleCNHs, unmaskCNH } from "./lib/generators/cnh";
import { MAX_BATCH_GENERATION } from "./lib/constants";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";
import { formatBatch, formatDocumentForExport } from "./lib/utils/formatter";
import { addToHistory } from "./lib/storage/history";
import { CNHFormValues, PreferencesType } from "./types";

export default function GenerateCNH() {
  const preferences = getPreferenceValues<PreferencesType>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CNHFormValues) {
    setIsLoading(true);

    try {
      const quantity = Math.min(parseInt(values.quantity) || 1, MAX_BATCH_GENERATION);

      const cnhs = generateMultipleCNHs({
        masked: values.masked,
        quantity,
      });

      if (quantity === 1) {
        const cnh = cnhs[0];
        const action = preferences.primaryAction || "copy";

        if (action === "paste") {
          await pasteToFrontmostApp(cnh);
        } else {
          await copyToClipboard(cnh, "CNH copiada com sucesso");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "CNH",
            value: unmaskCNH(cnh),
            masked: cnh,
          });
        }
      } else {
        const documents = cnhs.map((cnh) => formatDocumentForExport("CNH", unmaskCNH(cnh), cnh));

        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} CNHs copiadas com sucesso`);

        if (preferences.enableHistory) {
          for (const cnh of cnhs.slice(0, 10)) {
            await addToHistory({
              type: "CNH",
              value: unmaskCNH(cnh),
              masked: cnh,
            });
          }
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao gerar CNH",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Gerar Cnh" icon={Icon.Car} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="masked"
        label="Com formatação (XXX XXX XXX XX)"
        defaultValue={preferences.defaultMask !== false}
      />

      <Form.TextField
        id="quantity"
        title="Quantidade"
        placeholder="1"
        defaultValue={preferences.defaultQuantity || "1"}
        info={`Máximo: ${MAX_BATCH_GENERATION} itens`}
      />
    </Form>
  );
}
