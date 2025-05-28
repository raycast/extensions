import { showToast, Toast, Form, closeMainWindow, popToRoot } from "@raycast/api";
import { convertFileCore } from "./core/libreoffice";
import { getSelectedFiles } from "./core/finder";
import { FormComponent } from "./views/form";
import { useState, useEffect, useRef } from "react";

export default function ConvertFiles(props: { arguments: { format?: string; inputFiles?: string[] | null } }) {
  const format = props.arguments.format;
  const [showForm, setShowForm] = useState<boolean | null>(null);
  const [args, setArgs] = useState(props.arguments);
  const hasRun = useRef(false);

  async function handleConversion(params: { inputPaths: string[]; format: string }) {
    await closeMainWindow();

    if (!params.format) {
      await showToast(Toast.Style.Failure, "Format is required");
      return;
    }

    const files = params.inputPaths;
    if (!files || files.length === 0) {
      await showToast(Toast.Style.Failure, "No files selected");
      return;
    }

    console.log("Input files: ", files);
    await showToast(Toast.Style.Animated, "Converting files");

    let successful = 0,
      failed = 0;
    for (const file of files) {
      try {
        await convertFileCore(file, params.format);
        successful++;
      } catch (e) {
        console.error(e);
        failed++;
      }
    }

    const message = `Converted ${successful} file(s) to ${params.format}`;
    if (failed > 0) {
      await showToast(Toast.Style.Failure, `${message}, ${failed} failed`);
    } else {
      await showToast(Toast.Style.Success, message);
    }

    await popToRoot();
  }

  useEffect(() => {
    if (hasRun.current) return; // Prevent double execution
    hasRun.current = true;

    (async () => {
      const selectedFiles = await getSelectedFiles();

      // Validate input
      if (selectedFiles && selectedFiles.length > 0 && format) {
        await handleConversion({ inputPaths: selectedFiles, format: format || "" });
      } else {
        // Input is incomplete, show the form
        setArgs({ ...props.arguments, inputFiles: selectedFiles });
        setShowForm(true);
      }
    })();
  }, []);

  // Only show form if no files were selected in Finder
  if (showForm) {
    return <FormComponent arguments={args} onSubmit={handleConversion} />;
  }

  return <Form isLoading={true} />;
}
