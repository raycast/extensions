import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useMemo } from "react";

import type { BookManifest } from "../domain/book";
import { splitList } from "../domain/text";
import { errorMessage } from "../errors";
import { getLibraryStore } from "../storage";
import { MetadataFields, type MetadataFormValues } from "./MetadataFields";

interface BookMetadataFormProps {
  book: BookManifest;
  onSaved: (book: BookManifest) => void;
}

export function BookMetadataForm({ book, onSaved }: BookMetadataFormProps) {
  const { pop } = useNavigation();
  const store = useMemo(getLibraryStore, []);

  const { handleSubmit, itemProps, setValidationError } = useForm<MetadataFormValues>({
    initialValues: {
      title: book.title,
      authors: book.authors.join(", "),
      language: book.language,
      categories: book.categories.join(", "),
      visibility: book.visibility,
      license: book.license ?? "",
    },
    validation: { title: FormValidation.Required },
    async onSubmit(values) {
      if (values.visibility === "shared" && values.license.trim() === "") {
        setValidationError("license", "Required for shared books");
        return;
      }
      try {
        const saved = await store.updateMetadata(book.id, {
          title: values.title,
          authors: splitList(values.authors),
          language: values.language,
          categories: splitList(values.categories),
          license: values.license,
          visibility: values.visibility === "shared" ? "shared" : "private",
        });
        await showToast({ style: Toast.Style.Success, title: "Book updated" });
        onSaved(saved);
        pop();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Could not update book", message: errorMessage(error) });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Edit “${book.title}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <MetadataFields itemProps={itemProps} />
    </Form>
  );
}
