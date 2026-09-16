import { Form } from "@raycast/api";
import type { FormProps } from "@raycast/utils";

import { LANGUAGE_OPTIONS } from "../domain/languages";

export interface MetadataFormValues {
  title: string;
  authors: string;
  language: string;
  categories: string;
  visibility: string;
  license: string;
}

interface MetadataFieldsProps {
  itemProps: FormProps<MetadataFormValues>["itemProps"];
  /** Adds a "Detect from File" language option and detection placeholders. */
  detectFromFile?: boolean;
}

export const AUTO_LANGUAGE = "auto";

export function MetadataFields({ itemProps, detectFromFile = false }: MetadataFieldsProps) {
  return (
    <>
      <Form.TextField
        title="Title"
        placeholder={detectFromFile ? "Detected from the file" : "Book title"}
        {...itemProps.title}
      />
      <Form.TextField
        title="Authors"
        placeholder={detectFromFile ? "Comma-separated; detected when empty" : "Comma-separated"}
        {...itemProps.authors}
      />
      <Form.Dropdown title="Language" {...itemProps.language}>
        {detectFromFile ? <Form.Dropdown.Item value={AUTO_LANGUAGE} title="Detect from File" /> : null}
        {LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.code} value={option.code} title={option.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Categories" placeholder="fiction, history" {...itemProps.categories} />
      <Form.Dropdown title="Visibility" info="Private books never leave this Mac." {...itemProps.visibility}>
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="shared" title="Shared" />
      </Form.Dropdown>
      <Form.TextField
        title="License"
        placeholder="public-domain, CC-BY-4.0, …"
        info="Required for shared books."
        {...itemProps.license}
      />
    </>
  );
}
