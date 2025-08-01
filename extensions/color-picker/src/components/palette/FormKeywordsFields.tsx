import { Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { useKeywordUpdateToasts } from "../../hooks/useKeywordUpdateToasts";
import { UpdateKeywordsPromiseResult } from "../../types";
import { syncFormKeywords } from "../../utils/syncFormKeywords";

type FormKeywordsFieldsProps = {
  /** Keyword data */
  data: {
    /** Array of available keywords from global storage */
    keywords: string[] | undefined;
  };
  /** Form integration */
  form: {
    /** Form item properties for keywords field specifically */
    keywordProps: {
      value?: string[];
      onChange?: (value: string[]) => void;
      error?: string;
    };
  };
  actions: {
    /** Function to update the global keywords list and form state */
    onUpdate: (keywordsText: string) => Promise<UpdateKeywordsPromiseResult>;
    /** Function to create focus handlers for real-time tracking */
    focus: (fieldId: string) => {
      onFocus: () => void;
      onBlur: () => void;
    };
  };
};

export function FormKeywordsFields({ data, form, actions }: FormKeywordsFieldsProps) {
  const [updateKeywordsValue, setUpdateKeywordsValue] = useState("");
  const { showUpdateResult } = useKeywordUpdateToasts();

  // Combine global keywords with any selected keywords that might not be in the global list yet
  const availableKeywords = useMemo(() => {
    const globalKeywords = data.keywords || [];
    const selectedKeywords = form.keywordProps.value || [];

    // Create a Set to avoid duplicates, then convert back to array
    const allKeywords = [...new Set([...globalKeywords, ...selectedKeywords])];
    return allKeywords.sort(); // Sort for consistent display
  }, [data.keywords, form.keywordProps.value]);

  /**
   * Processes keyword input with comprehensive validation and user feedback.
   * Handles add/remove operations and provides contextual toast notifications.
   */
  const handleKeywordUpdateAndBlur = async () => {
    if (updateKeywordsValue.trim()) {
      const result = await actions.onUpdate(updateKeywordsValue);

      // Update form's selected keywords based on the results
      if (form.keywordProps.onChange) {
        const currentSelected = form.keywordProps.value || [];
        syncFormKeywords(result, currentSelected, form.keywordProps.onChange);
      }

      // Show appropriate toast notification
      showUpdateResult(result);

      setUpdateKeywordsValue("");
    }
  };

  // Combine the keyword update logic with focus tracking for the blur handler
  const handleCombinedBlur = async () => {
    // First handle the focus tracking
    actions.focus("updateKeywords").onBlur();

    // Then handle the keyword update logic
    await handleKeywordUpdateAndBlur();
  };

  return (
    <>
      <Form.TagPicker
        id="keywords"
        {...form.keywordProps}
        title="Keywords"
        info="Pick one or more Keywords. Keywords will be used to search and filter Color Palettes. If the Keywords list is empty, add them through the Update Keywords field. To remove a keyword from the Keywords list, enter !keyword-to-remove in the Update Keywords field."
        {...actions.focus("keywords")}
      >
        {availableKeywords.map((keyword) => (
          <Form.TagPicker.Item key={keyword} value={keyword} title={keyword} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="updateKeywords"
        title="Update Keywords"
        value={updateKeywordsValue}
        onChange={setUpdateKeywordsValue}
        placeholder="e.g., keyword1, keyword2, !keyword-to-remove"
        info="Enter Keywords separated by commas. Must be 2-20 chars, alphanumeric + hyphens only. Press Tab or move out of focus in order to add them to the Keywords List in the Keywords field above."
        onFocus={actions.focus("updateKeywords").onFocus}
        onBlur={handleCombinedBlur}
      />
    </>
  );
}
