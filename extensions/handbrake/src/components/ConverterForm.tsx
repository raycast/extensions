import { Form, ActionPanel, Action, showToast, Toast, showInFinder, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  convertMedia,
  checkExtensionType,
  OUTPUT_VIDEO_EXTENSIONS,
  INPUT_VIDEO_EXTENSIONS,
} from "../handBrake/converter";
import { getPresets } from "../handBrake/handBrakeCLI";
import { PresetGroup } from "../handBrake/presetParser";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [isConverting, setConverting] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_VIDEO_EXTENSIONS)[number]>(".mp4");
  const [presets, setPresets] = useState<PresetGroup[]>([]);
  const [preset, setPreset] = useState<string>("Fast 1080p30");

  useEffect(() => {
    loadDefaults();
    loadPresets();
    handleFileSelect(initialFiles);
  }, []);

  const loadDefaults = () => {
    (async () => {
      const preset = await LocalStorage.getItem("preset");
      if (preset && typeof preset === "string") {
        setPreset(preset);
      }
    })();
  };

  useEffect(() => {
    (async () => {
      if (preset) {
        await LocalStorage.setItem("preset", preset);
      }
    })();
  }, [preset]);

  const loadPresets = () => {
    (async () => {
      const presets = await getPresets();
      setPresets(presets);
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
          message: "No valid media files selected. Please select video files.",
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

  const handleSubmit = async () => {
    setConverting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Converting ${currentFiles.length} file${currentFiles.length > 1 ? "s" : ""}...`,
    });

    for (const item of currentFiles) {
      try {
        const outputPath = await convertMedia(item, outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number], preset);

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
      } catch (error) {
        await toast.hide();
        await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: String(error) });
      }
    }
    setConverting(false);
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
        onChange={(newFiles) => {
          handleFileSelect(newFiles);
        }}
      />
      {currentFiles.length > 0 && (
        <>
          <Form.Dropdown
            id="preset"
            title="Select preset"
            {...(presets.length > 0 && preset ? { defaultValue: preset } : {})}
            onChange={setPreset}
          >
            {presets.map((group) => (
              <Form.Dropdown.Section title={group.category} key={group.category}>
                {group.presets.map((item) => (
                  <Form.Dropdown.Item value={item} title={item} key={item} />
                ))}
              </Form.Dropdown.Section>
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="format"
            title="Select output format"
            value={outputFormat}
            onChange={(newFormat) => {
              setOutputFormat(newFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number]);
            }}
          >
            <Form.Dropdown.Section title="Formats">
              {OUTPUT_VIDEO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
