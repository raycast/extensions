import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { generateMultipleCards, CardBrand, getCardBrandName, unmaskCardNumber } from "./lib/generators/card";
import { CARD_BRANDS, MAX_BATCH_GENERATION } from "./lib/constants";
import { copyToClipboard, pasteToFrontmostApp } from "./lib/utils/clipboard";
import { formatBatch, formatCardForExport } from "./lib/utils/formatter";
import { addToHistory } from "./lib/storage/history";
import { CardFormValues, PreferencesType } from "./types";

export default function GenerateCard() {
  const preferences = getPreferenceValues<PreferencesType>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CardFormValues) {
    setIsLoading(true);

    try {
      const quantity = Math.min(parseInt(values.quantity) || 1, MAX_BATCH_GENERATION);
      const brand = values.brand as CardBrand;

      const cards = generateMultipleCards({
        brand,
        includeExpiry: values.includeExpiry,
        includeCVV: values.includeCVV,
        masked: values.masked,
        quantity,
      });

      if (quantity === 1) {
        const card = cards[0];
        let output = card.number;

        if (card.expiry || card.cvv) {
          const parts = [card.number];
          if (card.expiry) parts.push(`Expiry: ${card.expiry}`);
          if (card.cvv) parts.push(`CVV: ${card.cvv}`);
          output = parts.join(" | ");
        }

        const action = preferences.primaryAction || "copy";

        if (action === "paste") {
          await pasteToFrontmostApp(output);
        } else {
          await copyToClipboard(output, "Card copied successfully");
        }

        if (preferences.enableHistory) {
          await addToHistory({
            type: "Card",
            value: unmaskCardNumber(card.number),
            masked: card.number,
            metadata: {
              brand: getCardBrandName(brand),
              expiry: card.expiry,
              cvv: card.cvv,
            },
          });
        }
      } else {
        const documents = cards.map((card) => formatCardForExport(card));
        const formatted = formatBatch(documents, preferences.exportFormat || "json");
        await copyToClipboard(formatted, `${quantity} Cards copied successfully`);

        if (preferences.enableHistory) {
          for (const card of cards.slice(0, 10)) {
            await addToHistory({
              type: "Card",
              value: unmaskCardNumber(card.number),
              masked: card.number,
              metadata: {
                brand: getCardBrandName(brand),
                expiry: card.expiry,
                cvv: card.cvv,
              },
            });
          }
        }
      }
    } catch (error) {
      await showFailureToast(error, { title: "Error generating Card" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Card" icon={Icon.CreditCard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="brand" title="Card Brand" defaultValue="visa">
        {CARD_BRANDS.map((brand) => (
          <Form.Dropdown.Item key={brand.value} value={brand.value} title={brand.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id="includeExpiry" label="Include expiry date (MM/YY)" defaultValue={true} />

      <Form.Checkbox id="includeCVV" label="Include security code (CVV)" defaultValue={true} />

      <Form.Checkbox
        id="masked"
        label="With formatting (XXXX XXXX XXXX XXXX)"
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
