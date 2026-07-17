import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  CURRENT_PRESET_VALUE,
  IMAGE_OUTPUT_FORMATS,
  OutputFormat,
  parseOutputFormatOverride,
  parseQualityOverride,
  PRESET_QUALITY_VALUE,
  SAME_OUTPUT_FORMAT_VALUE,
  VIDEO_OUTPUT_FORMATS,
} from "./lib/constants";
import {
  buildCompressFilesDeeplink,
  openGetCompressDeeplink,
} from "./lib/deeplink";
import { getSelectedFilePaths } from "./lib/selection";
import {
  getCommonMediaType,
  getQualityOptionsForMediaType,
  readSharedData,
  SharedData,
} from "./lib/shared-data";
import { formatOptionTitle } from "./lib/text";

interface FormValues {
  presetId: string;
  quality?: string;
  outputFormat?: string;
}

interface CommandState {
  filePaths: string[];
  sharedData: SharedData;
  error?: string;
  isLoading: boolean;
}

export default function Command() {
  const [state, setState] = useState<CommandState>({
    filePaths: [],
    sharedData: {
      reusablePresets: [],
      presetsOptions: {},
      mediaTypesMapping: {},
    },
    isLoading: true,
  });
  const [selectedPresetId, setSelectedPresetId] =
    useState(CURRENT_PRESET_VALUE);

  useEffect(() => {
    async function load() {
      try {
        const [filePaths, sharedData] = await Promise.all([
          getSelectedFilePaths(),
          readSharedData(),
        ]);
        setState({ filePaths, sharedData, isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previousState) => ({
          ...previousState,
          error: message,
          isLoading: false,
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read selected files",
          message,
        });
      }
    }

    void load();
  }, []);

  const commonMediaType = useMemo(
    () => getCommonMediaType(state.filePaths, state.sharedData),
    [state.filePaths, state.sharedData],
  );
  const qualityOptions = useMemo(
    () => getQualityOptionsForMediaType(commonMediaType, state.sharedData),
    [commonMediaType, state.sharedData],
  );
  const outputFormats = getOutputFormats(commonMediaType);
  const isReusablePresetSelected = selectedPresetId !== CURRENT_PRESET_VALUE;

  if (state.error && !state.isLoading) {
    return <Detail markdown={`# Could not load files\n\n${state.error}`} />;
  }

  return (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Compress Files"
            onSubmit={(values: FormValues) =>
              handleSubmit(values, state.filePaths)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="presetId"
        title="Preset"
        value={selectedPresetId}
        onChange={setSelectedPresetId}
      >
        <Form.Dropdown.Item
          value={CURRENT_PRESET_VALUE}
          title="Use Current Preset"
        />
        {state.sharedData.reusablePresets.map((preset) => (
          <Form.Dropdown.Item
            key={preset.id}
            value={preset.id}
            title={preset.title}
          />
        ))}
      </Form.Dropdown>

      {!isReusablePresetSelected && commonMediaType ? (
        <Form.Dropdown
          id="quality"
          title={`${formatOptionTitle(commonMediaType)} Quality`}
        >
          <Form.Dropdown.Item
            value={PRESET_QUALITY_VALUE}
            title="Use Preset Quality"
          />
          {qualityOptions.map((quality) => (
            <Form.Dropdown.Item
              key={quality}
              value={quality}
              title={formatOptionTitle(quality)}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {!isReusablePresetSelected && outputFormats ? (
        <Form.Dropdown id="outputFormat" title="Output Format">
          <Form.Dropdown.Item
            value={SAME_OUTPUT_FORMAT_VALUE}
            title="Same as Preset/Input"
          />
          {outputFormats.map((outputFormat) => (
            <Form.Dropdown.Item
              key={outputFormat}
              value={outputFormat}
              title={formatOptionTitle(outputFormat)}
            />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

async function handleSubmit(values: FormValues, filePaths: string[]) {
  if (filePaths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No files selected",
      message:
        process.platform === "win32"
          ? "Select one or more files or folders in Explorer first."
          : "Select one or more files or folders in Finder first.",
    });
    return;
  }

  const isReusablePresetSelected = values.presetId !== CURRENT_PRESET_VALUE;
  const options = isReusablePresetSelected
    ? { presetId: values.presetId }
    : {
        quality: parseQualityOverride(values.quality),
        outputFormat: parseOutputFormatOverride(values.outputFormat),
      };

  const deeplink = buildCompressFilesDeeplink(filePaths, options);
  await openGetCompressDeeplink(deeplink);
}

function getOutputFormats(
  mediaType: string | undefined,
): OutputFormat[] | undefined {
  switch (mediaType) {
    case "video":
      return [...VIDEO_OUTPUT_FORMATS];
    case "image":
      return [...IMAGE_OUTPUT_FORMATS];
    default:
      return undefined;
  }
}
