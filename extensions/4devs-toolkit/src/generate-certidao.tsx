import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
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
          await copyToClipboard(certidao, "Certificate copied successfully");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "Certificate",
            value: unmaskCertidao(certidao),
            masked: certidao,
            metadata: { tipo: getCertidaoTypeName(type) },
          });
        }
      } else {
        const documents = certidoes.map((certidao) =>
          formatDocumentForExport("Certificate", unmaskCertidao(certidao), certidao, {
            type: getCertidaoTypeName(type),
          }),
        );

        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} Certificates copied successfully`);

        if (preferences.enableHistory) {
          for (const certidao of certidoes.slice(0, 10)) {
            await addToHistory({
              type: "Certificate",
              value: unmaskCertidao(certidao),
              masked: certidao,
              metadata: { type: getCertidaoTypeName(type) },
            });
          }
        }
      }
    } catch (error) {
      await showFailureToast(error, { title: "Error generating Certificate" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Certificate" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Certificate Type" defaultValue="nascimento">
        {CERTIDAO_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id="masked" label="With numeric formatting" defaultValue={preferences.defaultMask !== false} />

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
