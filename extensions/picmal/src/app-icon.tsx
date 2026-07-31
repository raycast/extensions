import { Action, ActionPanel, Detail, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";
import { categorize, FormatGroups, loadFormats } from "./lib/formats";

interface AppIconFormValues {
  input: string[];
  macos: boolean;
  windows: boolean;
  ios: boolean;
  overwrite: boolean;
}

/** Keep only image files, per Picmal's known formats. */
function imagesOnly(paths: string[], formats: FormatGroups | undefined): string[] {
  if (!formats || formats.image.length === 0) return paths;
  return paths.filter((path) => categorize(path, formats) === "image");
}

export default function AppIcon() {
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const { data: formats, isLoading: loadingFormats } = usePromise(loadFormats);
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue } = useForm<AppIconFormValues>({
    async onSubmit(values) {
      if (!values.macos && !values.windows && !values.ios) {
        await showToast({ style: Toast.Style.Failure, title: "Choose at least one format" });
        return;
      }
      await runAndReport("app-icon", {
        // app-icon works on one source; take the first image.
        input: imagesOnly(values.input, formats).slice(0, 1),
        macos: values.macos,
        windows: values.windows,
        ios: values.ios,
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: { input: [], macos: true, windows: true, ios: true, overwrite: false },
    validation: {
      input: (value) => (imagesOnly(value ?? [], formats).length === 0 ? "Select an image" : undefined),
    },
  });

  useEffect(() => {
    const images = imagesOnly(finderPaths ?? [], formats);
    if (images.length > 0) setValue("input", [images[0]]);
  }, [finderPaths, formats]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  return (
    <Form
      isLoading={loadingFormats || loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Icons" icon={Icon.AppWindow} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="Image" allowMultipleSelection={false} />
      <Form.Description title="Source" text="Use a square image at least 1024 × 1024 for crisp icons." />
      <Form.Separator />
      <Form.Checkbox {...itemProps.macos} label="macOS (.icns)" />
      <Form.Checkbox {...itemProps.windows} label="Windows (.ico)" />
      <Form.Checkbox {...itemProps.ios} label="iOS icon set (.appiconset)" />
      <Form.Separator />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
