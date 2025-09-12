import { Form, ActionPanel, Action, showToast, Toast, showInFinder, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { convertMedia, checkExtensionType, INPUT_VIDEO_EXTENSIONS } from "../gifski/converter";
import { useForm } from "@raycast/utils";

interface ConvertFormProps {
  fps: string;
  scaleW: string;
  scaleH: string;
}

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [isConverting, setConverting] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);

  useEffect(() => {
    loadDefaults();
    handleFileSelect(initialFiles);
  }, []);

  const submit = async (form: ConvertFormProps) => {
    setConverting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Converting ${currentFiles.length} file${currentFiles.length > 1 ? "s" : ""}...`,
    });

    for (const item of currentFiles) {
      try {
        const outputPath = await convertMedia(
          item,
          ".gif",
          form.fps,
          form.scaleW,
          form.scaleH.toLocaleLowerCase() == "auto" ? "-1" : form.scaleH,
        );

        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "File converted successfully!",
          message: "⌘O to open the file",
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              showInFinder(outputPath);
            },
          },
        });

        // Store defaults for next use
        await LocalStorage.setItem("fps", form.fps);
        await LocalStorage.setItem("scaleW", form.scaleW);
        await LocalStorage.setItem("scaleH", form.scaleH);
      } catch (error) {
        await toast.hide();
        await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: String(error) });
      }
    }
    setConverting(false);
  };

  const { handleSubmit, itemProps, setValue } = useForm<ConvertFormProps>({
    onSubmit: submit,
    validation: {
      fps: (value) => {
        if (!value?.match("^[0-9]*$")) {
          return "Fps must be a number";
        }
      },
      scaleW: (value) => {
        if (!value?.match("^[0-9]*$")) {
          return "Width must be a number";
        }
      },
      scaleH: (value) => {
        if (!value!.match("^[0-9]*$") && value?.toLocaleLowerCase() != "auto") {
          return "Height must be a number or 'Auto'";
        }
      },
    },
  });

  const loadDefaults = () => {
    (async () => {
      const fps: string = (await LocalStorage.getItem("fps")) ?? "10";
      setValue("fps", fps);

      const scaleW: string = (await LocalStorage.getItem("scaleW")) ?? "1014";
      setValue("scaleW", scaleW);

      const scaleH: string = (await LocalStorage.getItem("scaleH")) ?? "Auto";
      setValue("scaleH", scaleH);
    })();
  };

  const handleFileSelect = (files: string[]) => {
    // Files to convert
    let convertibles: string[] = [];

    try {
      convertibles = files.filter((file) => checkExtensionType(file, INPUT_VIDEO_EXTENSIONS));
      if (convertibles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "No valid media files selected. Please select video files",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing files",
        message: String(error),
      });
    } finally {
      setCurrentFiles(convertibles);
    }
  };

  return (
    <Form
      isLoading={isConverting}
      actions={
        <ActionPanel>
          {currentFiles && currentFiles.length > 0 && (
            <Action.SubmitForm title="Convert" onSubmit={handleSubmit} icon={Icon.NewDocument} />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="selectFiles"
        title="Select files"
        allowMultipleSelection={true}
        value={currentFiles}
        onChange={handleFileSelect}
      />
      {currentFiles.length > 0 && (
        <>
          <Form.TextField {...itemProps.fps} title="Frames per second (fps)" />
          <Form.TextField {...itemProps.scaleW} title="Width (pixels)" />
          <Form.TextField {...itemProps.scaleH} title="Height (pixels)" />
        </>
      )}
    </Form>
  );
}
