import { Form } from "@raycast/api";
import { useMemo } from "react";
import { UseKeywordsInputObject } from "../types";
import { withFocus } from "../utils/fieldProps";

type FormKeywordsFieldsProps = {
  /** Keyword data */
  data: {
    /** Array of available keywords from global storage */
    keywords: string[] | undefined;
  };
  /** Form integration */
  form: {
    /** Form item properties for keywords field specifically */
    keywordProps: Partial<Form.ItemProps<string[]>> & { id: string };
  };
  /** State of the Update Keywords text field; keywords are applied by the Add Keywords action */
  keywordsInput: UseKeywordsInputObject;
  /** Function to create focus handlers for real-time tracking */
  focus: (fieldId: string) => {
    onFocus: () => void;
    onBlur: () => void;
  };
};

export function FormKeywordsFields({ data, form, keywordsInput, focus }: FormKeywordsFieldsProps) {
  // Combine global keywords with any selected keywords that might not be in the global list yet
  const availableKeywords = useMemo(() => {
    const globalKeywords = data.keywords || [];
    const selectedKeywords = form.keywordProps.value || [];

    // Create a Set to avoid duplicates, then convert back to array
    const allKeywords = [...new Set([...globalKeywords, ...selectedKeywords])];
    return allKeywords.sort(); // Sort for consistent display
  }, [data.keywords, form.keywordProps.value]);

  return (
    <>
      <Form.TagPicker
        {...withFocus(form.keywordProps, focus("keywords"))}
        title="Keywords"
        info="Tags that help you find this Color Palette when searching in Manage Color Palettes. Pick them from your Keywords list; typing here only filters the list. To create or delete Keywords, use Update Keywords below."
      >
        {availableKeywords.map((keyword) => (
          <Form.TagPicker.Item key={keyword} value={keyword} title={keyword} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="updateKeywords"
        title="Update Keywords"
        value={keywordsInput.text}
        onChange={keywordsInput.setText}
        placeholder="e.g., keyword1, keyword2, !keyword-to-remove"
        info="Edit your Keywords list, shared by all Color Palettes. Type Keywords separated by commas and press ↵: they are created and added to this Color Palette. Type !keyword to delete one from the list. 2-20 characters: letters, numbers, hyphens."
        {...focus("updateKeywords")}
      />
    </>
  );
}
