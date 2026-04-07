import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getFrontmostApplication,
  getPreferenceValues,
  popToRoot,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { analyzeText, buildCleanedText, URLAnalysis } from "../utils/analyze";

export default function CleanFlow({ rawText }: { rawText: string }) {
  const { manualReview, exitAfterCleaning } = getPreferenceValues<Preferences>();
  const [analyses, setAnalyses] = useState<URLAnalysis[]>();

  useEffect(() => {
    analyzeText(rawText).then(async (results) => {
      if (results.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No URL found" });
        await popToRoot();
        return;
      }

      const hasParams = results.some((a) => a.params.length > 0);
      if (!manualReview || !hasParams) {
        await applyAndClose(rawText, results, exitAfterCleaning);
        return;
      }

      setAnalyses(results);
    });
  }, []);

  if (!analyses) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Clean URL"
            onSubmit={async (values: Record<string, string[]>) => {
              const updated = analyses.map((a, i) => ({
                ...a,
                params: a.params.map((p) => ({
                  ...p,
                  keep: (values[`url_${i}`] || []).includes(p.name),
                })),
              }));
              await applyAndClose(rawText, updated, exitAfterCleaning);
            }}
          />
        </ActionPanel>
      }
    >
      {analyses.map((analysis, i) => {
        if (analysis.params.length === 0) return null;
        return (
          <Form.TagPicker
            key={`url_${i}`}
            id={`url_${i}`}
            title={truncateURL(analysis.base)}
            defaultValue={analysis.params.filter((p) => p.keep).map((p) => p.name)}
          >
            {analysis.params.map((p) => (
              <Form.TagPicker.Item key={p.name} value={p.name} title={p.value ? `${p.name}=${p.value}` : p.name} />
            ))}
          </Form.TagPicker>
        );
      })}
    </Form>
  );
}

function truncateURL(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 1) + "…";
}

async function applyAndClose(rawText: string, analyses: URLAnalysis[], exitAfterCleaning: boolean) {
  const usedAI = analyses.some((a) => a.usedAI);
  const newText = buildCleanedText(rawText, analyses);

  await Clipboard.copy(newText);
  const frontmostApp = await getFrontmostApplication();

  if (exitAfterCleaning) {
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
  }

  await showToast({
    title: usedAI ? "Cleaned with AI" : "Tracking parameters removed",
    message: newText,
    style: Toast.Style.Success,
    primaryAction: {
      title: `Paste to ${frontmostApp.name}`,
      onAction: async () => {
        await Clipboard.paste(newText);
      },
    },
  });

  await popToRoot();
}
