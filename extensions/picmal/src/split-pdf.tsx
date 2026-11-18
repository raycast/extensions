import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";

interface SplitFormValues {
  input: string[];
  pages: string;
  overwrite: boolean;
}

/** Keep only the PDFs from a list of paths (case-insensitive extension match). */
function pdfsOnly(paths: string[]): string[] {
  return paths.filter((path) => path.toLowerCase().endsWith(".pdf"));
}

export default function SplitPdf() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<SplitFormValues>({
    async onSubmit(values) {
      await runAndReport("split-pdf", {
        input: pdfsOnly(values.input),
        pages: values.pages.trim() || undefined,
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], pages: "", overwrite: false },
    validation: {
      input: (value) => {
        const pdfs = pdfsOnly(value ?? []);
        if (pdfs.length < 1) return "Select at least one PDF";
        return undefined;
      },
    },
  });

  // Prefill the file picker with the PDFs in the current Finder selection.
  useEffect(() => {
    const pdfs = pdfsOnly(finderPaths ?? []);
    if (pdfs.length > 0) setValue("input", pdfs);
  }, [finderPaths]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const hasRanges = values.pages.trim().length > 0;

  return (
    <Form
      isLoading={loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Split PDF" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="PDFs" allowMultipleSelection />
      <Form.TextField {...itemProps.pages} title="Page ranges" placeholder="1-3, 5, 8-" />
      <Form.Description
        title="Result"
        text={
          hasRanges
            ? `One PDF per range (${values.pages.trim()}), saved next to each input.`
            : "Leave blank to split every page into its own PDF."
        }
      />
      <Form.Separator />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
