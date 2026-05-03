import {
  Action,
  ActionPanel,
  Form,
  List,
  useNavigation,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { redact, patterns } from "./engine";
import { getThreatFeeds } from "./storage";
import { RedactionMode, DetectionPolicy, Detection } from "./types";

const SAMPLE_DOCUMENT = `
From: john.doe@company.com
To: support@vendor.com
Subject: Account Setup

Hi there,

Please set up my new account:
- Credit Card: 4539 1488 0343 6467
- Phone: (555) 123-4567
- SSN: 123-45-6789
- AWS Key: AKIAIOSFODNN7EXAMPLE
- JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Database URL: postgresql://user:pass123@db.example.com:5432/mydb
Server IP: 192.168.1.100
File path: /Users/john/Documents/secret.txt

Best regards,
John
`.trim();

export default function Workbench() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<RedactionMode>("typed");
  const [policy, setPolicy] = useState<DetectionPolicy>("balanced");
  const [result, setResult] = useState<{
    text: string;
    detections: Detection[];
  } | null>(null);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences.Workbench>();
    setMode(preferences.defaultMode || "typed");
    setPolicy(preferences.defaultPolicy || "balanced");
  }, []);

  useEffect(() => {
    const performRedaction = async () => {
      if (!text.trim()) {
        setResult(null);
        return;
      }

      const feeds = await getThreatFeeds();
      const redactionResult = redact(text, mode, policy, feeds);
      setResult(redactionResult);
    };

    performRedaction();
  }, [text, mode, policy]);

  const { push } = useNavigation();

  const showDetections = () => {
    if (!result || result.detections.length === 0) {
      showToast(Toast.Style.Failure, "No detections found");
      return;
    }

    push(<DetectionsList detections={result.detections} />);
  };

  const loadSample = () => {
    setText(SAMPLE_DOCUMENT);
  };

  const copyToClipboard = async () => {
    if (result?.text) {
      await Clipboard.copy(result.text);
      showToast(Toast.Style.Success, "Copied to clipboard");
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        showToast(Toast.Style.Success, "Pasted from clipboard");
      }
    } catch {
      showToast(Toast.Style.Failure, "Failed to read clipboard");
    }
  };

  const modeOptions: { title: string; value: RedactionMode }[] = [
    { title: "Label ([REDACTED])", value: "label" },
    { title: "Typed ([EMAIL_REDACTED])", value: "typed" },
    { title: "Indexed ([EMAIL_1])", value: "indexed" },
    { title: "Masked (jo***@***.com)", value: "masked" },
  ];

  const policyOptions: { title: string; value: DetectionPolicy }[] = [
    { title: "Secrets", value: "secrets" },
    { title: "Balanced", value: "balanced" },
    { title: "Standard", value: "standard" },
    { title: "Enhanced", value: "enhanced" },
  ];

  const availableModes = modeOptions;
  const availablePolicies = policyOptions;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Show Detections" onAction={showDetections} />
          <Action title="Copy Result" onAction={copyToClipboard} />
          <Action title="Paste from Clipboard" onAction={pasteFromClipboard} />
          <Action title="Load Sample" onAction={loadSample} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Input Text"
        placeholder="Paste or type text to redact..."
        value={text}
        onChange={setText}
      />

      <Form.Dropdown
        id="mode"
        title="Redaction Mode"
        value={mode}
        onChange={(value) => setMode(value as RedactionMode)}
      >
        {availableModes.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.title}
            value={option.value}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="policy"
        title="Detection Policy"
        value={policy}
        onChange={(value) => setPolicy(value as DetectionPolicy)}
      >
        {availablePolicies.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.title}
            value={option.value}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="result"
        title={`Output (${result?.detections.length || 0} detections)`}
        value={result?.text || ""}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onChange={() => {}}
      />
    </Form>
  );
}

function DetectionsList({ detections }: { detections: Detection[] }) {
  const categorizedDetections = patterns.reduce((acc, pattern) => {
    const found = detections.filter((d) => d.type === pattern.name);
    if (found.length > 0) {
      if (!acc[pattern.category]) acc[pattern.category] = [];
      acc[pattern.category].push(...found.map((d) => ({ ...d, pattern })));
    }
    return acc;
  }, {} as Record<string, Array<Detection & { pattern: (typeof patterns)[0] }>>);

  return (
    <List navigationTitle="Detections">
      {Object.entries(categorizedDetections).map(([category, items]) => (
        <List.Section key={category} title={category.toUpperCase()}>
          {items.map((item, index) => (
            <List.Item
              key={`${item.type}-${index}`}
              title={item.pattern.description}
              subtitle={`Position: ${item.start}-${item.end}`}
              accessories={[{ text: `${Math.round(item.confidence * 100)}%` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    target={
                      <Detail
                        markdown={`# ${item.pattern.description}

**Type:** ${item.type}
**Value:** \`${item.value}\`
**Position:** ${item.start}-${item.end}
**Confidence:** ${Math.round(item.confidence * 100)}%
**Category:** ${item.pattern.category}

## Pattern Description
${item.pattern.description}
`}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
