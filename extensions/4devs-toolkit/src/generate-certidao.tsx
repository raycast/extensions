import { Action, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  generateMultipleCertidoes,
  unmaskCertidao,
  CertidaoType,
  getCertidaoTypeName,
} from "./lib/generators/certidao";
import { CERTIDAO_TYPES, MAX_BATCH_GENERATION } from "./lib/constants";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";
import { formatBatch, formatDocumentForExport } from "./lib/utils/formatter";
import { addToHistory } from "./lib/storage/history";
import { CertidaoFormValues, PreferencesType } from "./types";

export default function GenerateCertidao() {
  const preferences = getPreferenceValues<PreferencesType>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CertidaoFormValues) {
    setIsLoading(true);

    try {
      const quantity = Math.min(parseInt(values.quantity) || 1, MAX_BATCH_GENERATION);
      const type = values.type as CertidaoType;

      const certidoes = generateMultipleCertidoes({
        type,
        masked: values.masked,
        quantity,
      });

      if (quantity === 1) {
        const certidao = certidoes[0];
        const action = preferences.primaryAction || "copy";

        if (action === "paste") {
          await pasteToFrontmostApp(certidao);
        } else {
          await copyToClipboard(certidao, "Certidão copiada com sucesso");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "Certidão",
            value: unmaskCertidao(certidao),
            masked: certidao,
            metadata: { tipo: getCertidaoTypeName(type) },
          });
        }
      } else {
        const documents = certidoes.map((certidao) =>
          formatDocumentForExport("Certidão", unmaskCertidao(certidao), certidao, { tipo: getCertidaoTypeName(type) })
        );

        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} Certidões copiadas com sucesso`);

        if (preferences.enableHistory) {
          for (const certidao of certidoes.slice(0, 10)) {
            await addToHistory({
              type: "Certidão",
              value: unmaskCertidao(certidao),
              masked: certidao,
              metadata: { tipo: getCertidaoTypeName(type) },
            });
          }
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erro ao gerar Certidão",
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
          <Action.SubmitForm title="Gerar Certidão" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Tipo de Certidão" defaultValue="nascimento">
        {CERTIDAO_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id="masked" label="Com formatação numérica" defaultValue={preferences.defaultMask !== false} />

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
