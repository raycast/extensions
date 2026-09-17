import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";
import { categorize, FormatGroups, loadFormats } from "./lib/formats";

const PAGE_SIZE_OPTIONS = [
  { title: "Fit to Image", value: "fit", icon: Icon.AppWindow },
  { title: "A4", value: "a4", icon: Icon.Document },
  { title: "US Letter", value: "letter", icon: Icon.Document },
];

// images-to-pdf requires quality 40–100; "Automatic" omits the flag (CLI uses 85).
const QUALITY_OPTIONS = [
  { title: "Automatic", value: "" },
  { title: "Maximum (100)", value: "100" },
  { title: "High (90)", value: "90" },
  { title: "Balanced (80)", value: "80" },
  { title: "Small (70)", value: "70" },
  { title: "Smaller (60)", value: "60" },
  { title: "Smallest (50)", value: "50" },
];

interface ImagesToPDFFormValues {
  input: string[];
  pageSize: string;
  quality: string;
  password: string;
  overwrite: boolean;
}

/** Keep only the image files from a list of paths, per Picmal's known formats. */
function imagesOnly(paths: string[], formats: FormatGroups | undefined): string[] {
  // No usable format list (CLI unreachable/unparsed → empty groups): don't filter,
  // let the CLI decide. Otherwise filtering would reject every file.
  if (!formats || formats.image.length === 0) return paths;
  return paths.filter((path) => categorize(path, formats) === "image");
}

export default function ImagesToPDF() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: formats, isLoading: loadingFormats } = usePromise(loadFormats);
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue } = useForm<ImagesToPDFFormValues>({
    async onSubmit(values) {
      await runAndReport("images-to-pdf", {
        input: imagesOnly(values.input, formats),
        pageSize: values.pageSize || "fit",
        // Empty → omit so the CLI applies its default (85).
        quality: values.quality ? Number(values.quality) : undefined,
        password: values.password || undefined,
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], pageSize: "fit", quality: "", password: "", overwrite: false },
    validation: {
      input: (value) => (imagesOnly(value ?? [], formats).length === 0 ? "Select at least one image" : undefined),
      pageSize: FormValidation.Required,
    },
  });

  // Prefill the file picker with the images in the current Finder selection.
  useEffect(() => {
    const images = imagesOnly(finderPaths ?? [], formats);
    if (images.length > 0) setValue("input", images);
  }, [finderPaths, formats]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const prefilledCount = imagesOnly(finderPaths ?? [], formats).length;

  return (
    <Form
      isLoading={loadingFormats || loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create PDF" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="Images" allowMultipleSelection />
      <Form.Description title="Pages" text="One image per page, in the order shown." />
      {prefilledCount > 0 && (
        <Form.Description
          title="From Finder"
          text={`Prefilled ${prefilledCount} image${prefilledCount === 1 ? "" : "s"}`}
        />
      )}
      <Form.Dropdown {...itemProps.pageSize} title="Page Size">
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} icon={opt.icon} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.quality} title="Image Quality">
        {QUALITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value || "auto"} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.PasswordField {...itemProps.password} title="Password" placeholder="Optional — required to open the PDF" />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
