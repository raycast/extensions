import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { showFailureToast } from "@raycast/utils";

interface TermsAcknowledgementProps {
  onAccept: () => void;
}

export function TermsAcknowledgement({ onAccept }: TermsAcknowledgementProps) {
  const storage = useLocalStorage();

  const handleAccept = async () => {
    try {
      await storage.saveTermsAcceptance();
      onAccept();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save terms acceptance:" });
    }
  };

  const termsMarkdown = `
# Terms of Use & Disclaimer

## Important Notice
This extension is designed to help you discover and organize media content. Please read and understand the following terms before using this extension.

## Content Discovery
- This extension helps you search for and discover publicly available media content
- Content streams are sourced from various public repositories and services
- We do not host, store, or distribute any copyrighted content
- All content is provided by third-party sources

## User Responsibility
- You are responsible for ensuring your use complies with local laws and regulations
- Respect intellectual property rights and copyright laws
- Only access content you have legal rights to view
- Use streaming services and platforms in accordance with their terms of service

## Privacy & Data
- Your search history and preferences are stored locally on your device
- No personal data is transmitted to external servers without your consent
- You can clear your data at any time through the extension settings

## Disclaimer
- We are not responsible for the availability, quality, or legality of content from third-party sources
- Use this extension at your own discretion and risk
- The extension developers are not affiliated with any streaming services or content providers

## Support
- For issues or questions, please refer to the extension documentation
- Report any concerns through the appropriate channels

---

**By clicking "Accept & Continue", you acknowledge that you have read, understood, and agree to these terms.**
`;

  return (
    <Detail
      markdown={termsMarkdown}
      actions={
        <ActionPanel>
          <Action title="Accept & Continue" icon={Icon.Checkmark} onAction={handleAccept} />
        </ActionPanel>
      }
    />
  );
}

// Hook to check if terms have been accepted
export function useTermsAcceptance() {
  const storage = useLocalStorage();

  return {
    checkTermsAccepted: storage.checkTermsAccepted,
    resetTermsAcceptance: storage.resetTermsAcceptance,
  };
}
