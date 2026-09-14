import {
  Form,
  List,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
  Icon,
  closeMainWindow,
} from '@raycast/api';
import { useState } from 'react';
import path from 'path';
import { processImageOcr, captureAndExtractText } from './utils/ocr';
import { CaptureMode } from './utils/screenshot';

type ExtractStep = 'MENU' | 'CHOOSE_FILE';

export default function Command() {
  const [step, setStep] = useState<ExtractStep>('MENU');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileName = selectedFile ? path.basename(selectedFile) : '';

  function handleRemoveImage() {
    setSelectedFile(null);
  }

  async function performOcr(targetPath: string) {
    if (!targetPath || isLoading) return;

    setIsLoading(true);

    try {
      const result = await processImageOcr(targetPath);

      if (result.success && result.text) {
        await Clipboard.copy(result.text);
        await showToast({
          style: Toast.Style.Success,
          title: 'Text Copied to Clipboard!',
          message: result.text.length > 60 ? `${result.text.substring(0, 60)}...` : result.text,
        });
        await popToRoot({ clearSearchBar: true }).catch(() => {});
        await closeMainWindow({ clearRootSearch: true }).catch(() => {});
      } else if (result.success && !result.text) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'No Text Found',
          message: 'The selected image contains no readable text',
        });
        setIsLoading(false);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'OCR Failed',
          message: result.message || 'Could not process selected image',
        });
        setIsLoading(false);
      }
    } catch (error) {
      const err = error as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: err.message || 'Failed to run Windows OCR',
      });
      setIsLoading(false);
    }
  }

  // STATE 2: CHOOSE / DISPLAY EXISTING IMAGE
  if (step === 'CHOOSE_FILE') {
    if (selectedFile) {
      return (
        <Detail
          isLoading={isLoading}
          markdown={`### 🖼️ Selected Image: \`${fileName}\`\n\n**Full Path:** \`${selectedFile}\`\n\n---\n\n👉 **Press \`Enter\` to extract text from this image.**`}
          actions={
            <ActionPanel>
              <Action title="Extract Text from Image" icon={Icon.Check} onAction={() => performOcr(selectedFile)} />
              <Action
                title="Choose Different Image"
                icon={Icon.Image}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={handleRemoveImage}
              />
              <Action
                title="Back to Options"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ['cmd'], key: '[' }}
                onAction={() => {
                  setSelectedFile(null);
                  setStep('MENU');
                }}
              />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Select Image File Above" onAction={() => {}} />
            <Action
              title="Back to Options"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ['cmd'], key: '[' }}
              onAction={() => {
                setSelectedFile(null);
                setStep('MENU');
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="files"
          title="Select Image File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          canChooseFiles={true}
          value={[]}
          onChange={(files) => {
            if (files && files.length > 0) {
              setSelectedFile(files[0]);
            }
          }}
        />
        <Form.Description text="Click 'Select File' above with your mouse to choose an image from your computer." />
        <Form.Description text="Supported formats: PNG, JPG, JPEG, BMP, WebP" />
      </Form>
    );
  }

  // STATE 1: INITIAL EXTRACT TEXT MENU (List with 2 Choices)
  return (
    <List searchBarPlaceholder="Choose an option to extract text...">
      <List.Item
        icon={Icon.Camera}
        title="📸 Take Screenshot & Extract Text"
        subtitle="Capture a new screenshot and extract its text"
        actions={
          <ActionPanel>
            <Action title="Take Screenshot (region)" icon={Icon.Crop} onAction={() => handleTakeScreenshot('region')} />
            <Action
              title="Take Screenshot (window)"
              icon={Icon.Window}
              onAction={() => handleTakeScreenshot('window')}
            />
            <Action
              title="Take Screenshot (full Screen)"
              icon={Icon.Monitor}
              onAction={() => handleTakeScreenshot('screen')}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Image}
        title="🖼️ Extract Text from Image"
        subtitle="Select an image file already saved on your computer"
        actions={
          <ActionPanel>
            <Action title="Extract Text from Image" icon={Icon.Image} onAction={() => setStep('CHOOSE_FILE')} />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function handleTakeScreenshot(mode: CaptureMode = 'region') {
  closeMainWindow({ clearRootSearch: true }).catch(() => {});

  try {
    const result = await captureAndExtractText(mode);

    if (result.cancelled) {
      await popToRoot({ clearSearchBar: true }).catch(() => {});
      return;
    }

    if (result.success && result.text) {
      await Clipboard.copy(result.text);
      await showToast({
        style: Toast.Style.Success,
        title: 'Text Copied to Clipboard!',
        message: result.text.length > 60 ? `${result.text.substring(0, 60)}...` : result.text,
      });
    } else if (result.success && !result.text) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No Text Found',
        message: 'The captured screenshot contains no readable text',
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: 'OCR Failed',
        message: result.message || 'Could not process captured screenshot',
      });
    }
  } catch (error) {
    const err = error as Error;
    await showToast({
      style: Toast.Style.Failure,
      title: 'Error',
      message: err.message || 'Failed to run screenshot OCR',
    });
  } finally {
    await popToRoot({ clearSearchBar: true }).catch(() => {});
  }
}
