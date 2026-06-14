import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchProps,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
} from '@raycast/api';
import { memo, useMemo, useReducer, useRef } from 'react';
import { PRESETS, PresetId, getPreset } from './presets';
import { RawPreferences, resolveRevisionRequest, reviseText } from './model';

type Preferences = RawPreferences & {
  concealClipboard: boolean;
};

type CommandArguments = {
  text?: string;
};

type CommandProps = LaunchProps<{
  arguments: CommandArguments;
}>;

type ResultState = {
  originalText: string;
  revisedText: string;
  preset: PresetId;
  customInstructions: string;
  model: string;
};

type CommandState = {
  sourceText: string;
  preset: PresetId;
  customInstructions: string;
  isLoading: boolean;
  result: ResultState | null;
};

type CommandAction =
  | { type: 'sourceTextChanged'; value: string }
  | { type: 'presetChanged'; value: PresetId }
  | { type: 'customInstructionsChanged'; value: string }
  | { type: 'revisionStarted' }
  | { type: 'revisionSucceeded'; result: ResultState }
  | { type: 'revisionFailed' }
  | { type: 'startOver'; sourceText: string };

const DEFAULT_PRESET: PresetId = 'grammar';

function createInitialState(sourceText: string): CommandState {
  return {
    sourceText,
    preset: DEFAULT_PRESET,
    customInstructions: '',
    isLoading: false,
    result: null,
  };
}

function commandReducer(state: CommandState, action: CommandAction): CommandState {
  switch (action.type) {
    case 'sourceTextChanged':
      return { ...state, sourceText: action.value };
    case 'presetChanged':
      return { ...state, preset: action.value };
    case 'customInstructionsChanged':
      return { ...state, customInstructions: action.value };
    case 'revisionStarted':
      return { ...state, isLoading: true };
    case 'revisionSucceeded':
      return { ...state, isLoading: false, result: action.result };
    case 'revisionFailed':
      return { ...state, isLoading: false };
    case 'startOver':
      return { ...state, sourceText: action.sourceText, result: null };
  }
}

async function handlePaste(text: string) {
  try {
    await Clipboard.paste(text);
    await showToast({
      style: Toast.Style.Success,
      title: 'Pasted revised text',
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Paste failed',
      message: error instanceof Error ? error.message : 'Could not paste the revised text.',
    });
  }
}

async function handleCopy(text: string, concealClipboard: boolean) {
  try {
    await Clipboard.copy(text, { concealed: concealClipboard });
    await showToast({
      style: Toast.Style.Success,
      title: 'Copied revised text',
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Copy failed',
      message: error instanceof Error ? error.message : 'Could not copy the revised text.',
    });
  }
}

type ResultMetadataProps = {
  result: ResultState;
};

const ResultMetadata = memo(function ResultMetadata({ result }: ResultMetadataProps) {
  const presetInfo = getPreset(result.preset);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Preset" text={presetInfo.title} />
      <Detail.Metadata.Label
        title="Custom Instructions"
        text={result.customInstructions || 'None'}
      />
      <Detail.Metadata.Label title="Model" text={result.model} />
    </Detail.Metadata>
  );
});

type ResultViewProps = {
  concealClipboard: boolean;
  onStartOver: (nextText?: string) => void;
  result: ResultState;
};

function ResultView({ concealClipboard, onStartOver, result }: ResultViewProps) {
  const metadata = useMemo(() => <ResultMetadata result={result} />, [result]);

  return (
    <Detail
      navigationTitle="Fix My Text"
      markdown={buildResultMarkdown(result.revisedText, result.originalText)}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action
            title="Copy Revised Text"
            icon={Icon.Clipboard}
            onAction={() => handleCopy(result.revisedText, concealClipboard)}
          />
          <Action
            title="Paste Revised Text"
            icon={Icon.ArrowRight}
            onAction={() => handlePaste(result.revisedText)}
          />
          <Action
            title="Edit Revised Text"
            icon={Icon.Pencil}
            onAction={() => onStartOver(result.revisedText)}
          />
          <Action
            title="Back to Original"
            icon={Icon.RotateAntiClockwise}
            onAction={() => onStartOver(result.originalText)}
          />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: CommandProps) {
  const preferences = getPreferenceValues<Preferences>();
  const [state, dispatch] = useReducer(
    commandReducer,
    props.arguments.text?.trim() ?? '',
    createInitialState,
  );
  const lastSubmittedText = useRef('');

  const { sourceText, preset, customInstructions, isLoading, result } = state;
  const selectedPreset = getPreset(preset);

  async function handleSubmit() {
    if (isLoading) {
      return;
    }

    const trimmedText = sourceText.trim();

    if (!trimmedText) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Text is required',
        message: 'Paste or type something to revise.',
      });
      return;
    }

    const request = resolveRevisionRequest(preferences, {
      sourceText: trimmedText,
      presetInstruction: selectedPreset.instruction,
      customInstructions,
    });

    dispatch({ type: 'revisionStarted' });
    lastSubmittedText.current = trimmedText;

    try {
      const revisedText = await reviseText(request);

      dispatch({
        type: 'revisionSucceeded',
        result: {
          originalText: trimmedText,
          revisedText,
          preset,
          customInstructions: customInstructions.trim(),
          model: request.model,
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: 'Text revised',
      });
    } catch (error) {
      dispatch({ type: 'revisionFailed' });
      const message = error instanceof Error ? error.message : 'The request failed.';
      await showToast({
        style: Toast.Style.Failure,
        title: 'Revision failed',
        message,
      });
    }
  }

  async function handleLoadClipboard() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Clipboard is empty',
          message: 'Copy some text first.',
        });
        return;
      }

      dispatch({ type: 'sourceTextChanged', value: clipboardText });
      await showToast({
        style: Toast.Style.Success,
        title: 'Loaded from clipboard',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the clipboard.';
      await showToast({
        style: Toast.Style.Failure,
        title: 'Clipboard read failed',
        message,
      });
    }
  }

  function handleStartOver(nextText?: string) {
    dispatch({ type: 'startOver', sourceText: nextText ?? lastSubmittedText.current });
  }

  if (result) {
    return (
      <ResultView
        concealClipboard={preferences.concealClipboard}
        onStartOver={handleStartOver}
        result={result}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Fix My Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Revise Text" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action title="Load Clipboard" icon={Icon.Clipboard} onAction={handleLoadClipboard} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="Revise text through the OpenAI-compatible server you configured." />
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={preset}
        onChange={(newValue) => dispatch({ type: 'presetChanged', value: newValue as PresetId })}
      >
        {PRESETS.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="sourceText"
        title="Text"
        placeholder="Paste or type the text you want to revise"
        value={sourceText}
        onChange={(value) => dispatch({ type: 'sourceTextChanged', value })}
      />
      <Form.TextArea
        id="customInstructions"
        title="Custom Instructions"
        placeholder="Optional: keep my voice, make it more direct, simplify technical jargon..."
        value={customInstructions}
        onChange={(value) => dispatch({ type: 'customInstructionsChanged', value })}
      />
      <Form.Description text={selectedPreset.description} />
      <Form.Description text="Click the Revise Text action in the bottom bar, or press Cmd+Enter." />
    </Form>
  );
}

function buildResultMarkdown(revisedText: string, originalText: string): string {
  return [
    '## Revised',
    '',
    buildCodeBlock(revisedText),
    '',
    '## Original',
    '',
    buildCodeBlock(originalText),
  ].join('\n');
}

function buildCodeBlock(text: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));

  return [fence + 'text', text, fence].join('\n');
}
