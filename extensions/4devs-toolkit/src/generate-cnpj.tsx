import { Action, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { generateMultipleCNPJs, unmaskCNPJ } from "./lib/generators/cnpj";
import { MAX_BATCH_GENERATION } from "./lib/constants";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";
import { formatBatch, formatDocumentForExport } from "./lib/utils/formatter";
import { addToHistory } from "./lib/storage/history";
import { CNPJFormValues, PreferencesType } from "./types";

export default function GenerateCNPJ() {
  const preferences = getPreferenceValues<PreferencesType>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CNPJFormValues) {
    setIsLoading(true);

    try {
      const quantity = Math.min(parseInt(values.quantity) || 1, MAX_BATCH_GENERATION);

      const cnpjs = generateMultipleCNPJs({
        masked: values.masked,
        quantity,
      });

      if (quantity === 1) {
        const cnpj = cnpjs[0];
        const action = preferences.primaryAction || "copy";

        if (action === "paste") {
          await pasteToFrontmostApp(cnpj);
        } else {
          await copyToClipboard(cnpj, "CNPJ copiado com sucesso");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "CNPJ",
            value: unmaskCNPJ(cnpj),
            masked: cnpj,
          });
        }
      } else {
        const documents = cnpjs.map((cnpj) => formatDocumentForExport("CNPJ", unmaskCNPJ(cnpj), cnpj));

        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} CNPJs copiados com sucesso`);

        if (preferences.enableHistory) {
          for (const cnpj of cnpjs.slice(0, 10)) {
            await addToHistory({
              type: "CNPJ",
              value: unmaskCNPJ(cnpj),
              masked: cnpj,
            });
          }
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao gerar CNPJ",
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
          <Action.SubmitForm title="Gerar Cnpj" icon={Icon.Building} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="masked"
        label="Com formatação (XX.XXX.XXX/XXXX-XX)"
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
