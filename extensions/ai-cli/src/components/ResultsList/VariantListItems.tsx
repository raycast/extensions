import { List } from "@raycast/api";
import { FormattingVariant } from "@/types";
import { formatVariantMarkdown } from "@/utils/variant-formatting";
import { ListItemActionPanel } from "./ListItemActionPanel";
import React from "react";

interface VariantListItemsProps {
  variants: FormattingVariant[];
  onShowPrompt?: () => React.ReactElement;
  onGenerate?: () => void;
}

/**
 * VariantListItems Component
 *
 * Renders a list of formatting variant items with detailed markdown content and action panels.
 * Each variant is displayed as a List.Item with appropriate title, detail view, and actions.
 *
 * Features:
 * - Dynamic title generation based on variant count
 * - Markdown-formatted detail views
 * - Action panels with generation and prompt viewing capabilities
 * - Proper key management for list items
 */
export default function VariantListItems({ variants, onShowPrompt, onGenerate }: VariantListItemsProps) {
  return (
    <>
      {variants.map((variant, index, arr) => {
        const markdownContent = formatVariantMarkdown(variant);
        const hasError = !!variant.error;

        // Create accessories array with error indicator and index
        const accessories = [{ text: `#${arr.length - index}${hasError ? " ⚠️" : ""}` }];

        return (
          <List.Item
            key={variant.id}
            id={variant.id}
            title={variant.originalInput || ""}
            accessories={accessories}
            detail={<List.Item.Detail markdown={markdownContent} />}
            actions={<ListItemActionPanel variant={variant} onShowPrompt={onShowPrompt} onGenerate={onGenerate} />}
          />
        );
      })}
    </>
  );
}
