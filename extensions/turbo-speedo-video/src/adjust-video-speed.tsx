import {
  ActionPanel,
  Action,
  Detail,
  Form,
  getSelectedFinderItems,
  showHUD,
  showToast,
  Toast,
  Icon,
  List,
  showInFinder,
  LaunchProps,
} from '@raycast/api';
import { useState, useEffect } from 'react';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
import { VideoProcessor } from './utils/video-processor';
import {
  SpeedMultiplier,
  SUPPORTED_EXTENSIONS,
  SPEED_OPTIONS,
} from './utils/constants';

interface FormValues {
  speed: SpeedMultiplier;
  outputPath: string;
}

export default function AdjustVideoSpeed(_props: LaunchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);

  const [speed, setSpeed] = useState<SpeedMultiplier>('2');
  const [outputPath, setOutputPath] = useState<string>('');

  const handleSubmit = async (values: FormValues) => {
    if (!selectedFile) {
      showToast({
        style: Toast.Style.Failure,
        title: 'No file selected',
        message: 'Please select a video file first',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const processor = new VideoProcessor();
      const outputPath = await processor.processVideo(
        selectedFile,
        values.speed
      );

      showHUD('Video processing completed!');
      showToast({
        style: Toast.Style.Success,
        title: 'Success',
        message: `Video saved to ${outputPath}`,
      });

      // Open the output file in Finder
      await showInFinder(outputPath);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: 'Processing failed',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkFfmpegAvailability();
    loadSelectedFile();
  }, []);

  const checkFfmpegAvailability = async () => {
    try {
      await execFileAsync('/usr/local/bin/ffmpeg', ['-version']);
      setFfmpegAvailable(true);
    } catch {
      setFfmpegAvailable(false);
    }
  };

  const loadSelectedFile = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0) {
        const file = selectedItems[0];
        const extension = file.path.split('.').pop()?.toLowerCase();

        if (extension && SUPPORTED_EXTENSIONS.includes(extension as any)) {
          setSelectedFile(file.path);
          setOutputPath(generateOutputPath(file.path, '2'));
        } else {
          setError(
            `Unsupported file format: ${extension}. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
          );
        }
      }
    } catch (err) {
      // No file selected, that's okay
    }
  };

  const generateOutputPath = (
    inputPath: string,
    speed: SpeedMultiplier
  ): string => {
    const pathParts = inputPath.split('.');
    const extension = pathParts.pop();
    const basePath = pathParts.join('.');
    return `${basePath}_x${speed}.${extension}`;
  };

  const handleSpeedChange = (speed: SpeedMultiplier) => {
    setSpeed(speed);
    if (selectedFile) {
      setOutputPath(generateOutputPath(selectedFile, speed));
    }
  };

  if (ffmpegAvailable === false) {
    return (
      <Detail
        markdown={`
# FFmpeg Not Found

FFmpeg is required to process videos. Please install it:

## Installation Options

### Using Homebrew (Recommended)
\`\`\`bash
brew install ffmpeg
\`\`\`

### Using MacPorts
\`\`\`bash
sudo port install ffmpeg
\`\`\`

### Manual Installation
1. Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Add to your PATH

After installation, restart Raycast and try again.
        `}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url="https://ffmpeg.org/download.html"
              title="Download FFmpeg"
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error && !selectedFile) {
    return (
      <Detail
        markdown={`
# Error

${error}

## How to use this extension:

1. Select a video file in Finder
2. Open this Raycast command
3. Choose your desired speed multiplier
4. Click "Process Video"

## Supported formats:
${SUPPORTED_EXTENSIONS.map((ext) => `- ${ext}`).join('\n')}
        `}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              onAction={() => {
                setError(null);
                loadSelectedFile();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!selectedFile) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Video}
          title="No Video File Selected"
          description="Select a video file in Finder and run this command again"
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Process Video"
            icon={Icon.Video}
            onAction={() => handleSubmit({ speed, outputPath })}
          />
          <Action
            title="Select Different File"
            icon={Icon.Folder}
            onAction={loadSelectedFile}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Selected File" text={selectedFile} />

      <Form.Dropdown
        id="speed"
        value={speed}
        title="Speed Multiplier"
        info="Choose how much faster/slower to play the video (0.25x - 40x)"
        onChange={(value) => {
          const speed = value as SpeedMultiplier;
          handleSpeedChange(speed);
        }}
      >
        {SPEED_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.label}
            icon={option.hasAudioLimit ? Icon.Clock : Icon.Play}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="outputPath"
        value={outputPath}
        onChange={setOutputPath}
        title="Output Path"
        info="Where to save the processed video"
        placeholder="Output file path"
      />

      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
