import { getPreferenceValues } from '@raycast/api';
import { ActionPanel, Action, List, Icon, showToast, Toast, Clipboard } from '@raycast/api';
import { otp } from './pass';

interface OptRowProps {
  file: string;
  storepath: string;
}

export function OtpRow({ file, storepath }: OptRowProps) {
  const { defaultAction } = getPreferenceValues();

  async function handleAction(action: string) {
    try {
      const content = await otp(file, storepath);
      if (action === 'paste') {
        await Clipboard.paste(content);
      } else if (action === 'copy') {
        await Clipboard.copy(content);
      }
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, 'Failed to generate OTP');
    }
  }

  return (
    <List.Item
      icon={Icon.Key}
      title="otpauth"
      actions={
        <ActionPanel>
          {defaultAction === 'copy' ? (
            <>
              <Action title="Copy OTP to Clipboard" onAction={() => handleAction('copy')} />
              <Action title="Paste OTP in Active App" onAction={() => handleAction('paste')} />
            </>
          ) : (
            <>
              <Action title="Paste OTP in Active App" onAction={() => handleAction('paste')} />
              <Action title="Copy OTP to Clipboard" onAction={() => handleAction('copy')} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
