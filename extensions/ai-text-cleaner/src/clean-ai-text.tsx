import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  environment,
  Detail,
  Navigation,
  useNavigation,
} from "@raycast/api";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { useState } from "react";

interface CleaningStats {
  hidden: number;
  nbsp: number;
  dashes: number;
  quotes: number;
  ellipsis: number;
  trailingWhitespace: number;
  totalRemoved: number;
  percentReduction?: number;
}

interface ApiResponse {
  text: string;
  stats: CleaningStats;
}

interface FormValues {
  textToClean: string;
}

interface CleaningResultDetailProps {
  cleanedText: string;
  stats: CleaningStats;
  navigation: Navigation;
}

function CleaningResultDetail({ cleanedText, stats, navigation }: CleaningResultDetailProps) {
  const markdown = `## Cleaned Text\n\n\`\`\`\n${cleanedText}\n\`\`\`\n`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Cleaning Result"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Cleaned Text" content={cleanedText} />
          <Action title="Back to Form" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Hidden Characters" text={String(stats.hidden)} />
          <Detail.Metadata.Label title="Non-breaking Spaces" text={String(stats.nbsp)} />
          <Detail.Metadata.Label title="Dashes Normalized" text={String(stats.dashes)} />
          <Detail.Metadata.Label title="Quotes Normalized" text={String(stats.quotes)} />
          <Detail.Metadata.Label title="Ellipses Normalized" text={String(stats.ellipsis)} />
          <Detail.Metadata.Label title="Trailing Whitespace" text={String(stats.trailingWhitespace)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Characters Removed" text={String(stats.totalRemoved)} />
          {stats.percentReduction !== undefined && (
            <Detail.Metadata.Label title="Reduction Percentage" text={`${stats.percentReduction.toFixed(2)}%`} />
          )}
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (!values.textToClean.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Text to clean cannot be empty.",
        });
        return;
      }

      setIsLoading(true);

      const apiUrl = environment.isDevelopment
        ? "http://localhost:3001/api/normalize"
        : "https://aitextclean.com/api/normalize";

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: values.textToClean,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} ${errorText || response.statusText}`);
        }

        const data: ApiResponse = await response.json();

        await Clipboard.copy(data.text);

        push(<CleaningResultDetail cleanedText={data.text} stats={data.stats} navigation={{ push, pop }} />);

        showToast({
          style: Toast.Style.Success,
          title: "Text Cleaned & Copied!",
          message: `Removed ${data.stats.totalRemoved} characters (${data.stats.percentReduction?.toFixed(2) || 0}%)`,
        });
      } catch (error) {
        showFailureToast(error, { title: "Error Cleaning Text" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      textToClean: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clean Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text to clean"
        placeholder="Paste your text here"
        {...itemProps.textToClean}
        info="The text you want to process. We do not store your text! Simply return the cleaned text."
      />
    </Form>
  );
}
