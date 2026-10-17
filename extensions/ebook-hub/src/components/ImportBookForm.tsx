import { Action, ActionPanel, Form, Icon, Toast, getSelectedFinderItems, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import type { BookManifest } from "../domain/book";
import { normalizeLanguageTag } from "../domain/languages";
import { splitList } from "../domain/text";
import { errorMessage } from "../errors";
import { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS, detectFormat, importFile } from "../importers";
import { getLibraryStore } from "../storage";
import { AUTO_LANGUAGE, MetadataFields, type MetadataFormValues } from "./MetadataFields";
import { Reader } from "./Reader";

interface ImportFormValues extends MetadataFormValues {
  files: string[];
}

interface ImportBookFormProps {
  /** When set, the form pops back to the caller instead of opening the reader. */
  onImported?: (book: BookManifest) => void;
}

export function ImportBookForm({ onImported }: ImportBookFormProps) {
  const { push, pop } = useNavigation();
  const store = useMemo(getLibraryStore, []);
  const [isSubmitting, setSubmitting] = useState(false);

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<ImportFormValues>({
    initialValues: {
      files: [],
      title: "",
      authors: "",
      language: AUTO_LANGUAGE,
      categories: "",
      visibility: "private",
      license: "",
    },
    validation: {
      files: (value) => {
        const path = value?.[0];
        if (!path) {
          return "Choose a file";
        }
        return detectFormat(path) ? undefined : `Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`;
      },
    },
    async onSubmit(values) {
      if (values.visibility === "shared" && values.license.trim() === "") {
        setValidationError("license", "Required for shared books");
        return;
      }

      setSubmitting(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Importing book…" });
      try {
        const result = await importFile(values.files[0]);
        const book = await store.create({
          title: values.title.trim() || result.book.title,
          authors: values.authors.trim() ? splitList(values.authors) : result.book.authors,
          language: values.language === AUTO_LANGUAGE ? normalizeLanguageTag(result.book.language) : values.language,
          categories: splitList(values.categories),
          license: values.license.trim() || null,
          visibility: values.visibility === "shared" ? "shared" : "private",
          source: { kind: "import", format: result.format, fileName: result.fileName },
          chapters: result.book.chapters,
        });

        toast.style = Toast.Style.Success;
        toast.title = `Imported “${book.title}”`;
        toast.message = [`${book.chapters.length} chapters`, ...result.book.warnings].join(" · ");

        if (onImported) {
          onImported(book);
          pop();
        } else {
          push(<Reader bookId={book.id} />);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Import failed";
        toast.message = errorMessage(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        const supported = items.find((item) => detectFormat(item.path));
        if (supported) {
          setValue("files", [supported.path]);
        }
      })
      .catch(() => {
        // Expected when Finder is not frontmost or nothing is selected: there is nothing to prefill.
      });
  }, []);

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Book" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info={`Markdown, plain text, EPUB, or PDF, up to ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`}
        {...itemProps.files}
      />
      <Form.Separator />
      <MetadataFields itemProps={itemProps} detectFromFile />
    </Form>
  );
}
