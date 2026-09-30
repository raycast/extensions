import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";

interface CombineFormValues {
  input: string[];
  overwrite: boolean;
}

/** Keep only the PDFs from a list of paths (case-insensitive extension match). */
function pdfsOnly(paths: string[]): string[] {
  return paths.filter((path) => path.toLowerCase().endsWith(".pdf"));
}

export default function Combine() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<CombineFormValues>({
    async onSubmit(values) {
      await runAndReport("combine", {
        input: pdfsOnly(values.input),
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], overwrite: false },
    validation: {
      input: (value) => {
        const pdfs = pdfsOnly(value ?? []);
        if (pdfs.length < 2) return "Select at least two PDFs";
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

  const selectedPdfs = pdfsOnly(values.input ?? []);
  const prefilledCount = pdfsOnly(finderPaths ?? []).length;

  return (
    <Form
      isLoading={loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Combine PDFs" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="PDFs" allowMultipleSelection />
      <Form.Description
        title="Order"
        text={
          selectedPdfs.length >= 2
            ? `Merged top-to-bottom into one PDF — ${selectedPdfs.length} files in this order.`
            : "Pick two or more PDFs. They merge in the order shown, top to bottom."
        }
      />
      {prefilledCount > 0 && (
        <Form.Description
          title="From Finder"
          text={`Prefilled ${prefilledCount} PDF${prefilledCount === 1 ? "" : "s"}`}
        />
      )}
      <Form.Separator />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
