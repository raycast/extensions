import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dump as yamlDump } from "js-yaml";
import { Application, applicationUrl, getApplication } from "./argocd";
import { stripNoise } from "./manifest";

export function ApplicationManifest({ name }: { name: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(async (n: string) => getApplication(n), [name], {
    onError: (err) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load manifest", message: err.message });
    },
  });

  const cleaned = data ? (stripNoise(data) as Application) : undefined;
  const yaml = cleaned ? yamlDump(cleaned, { lineWidth: 120, noRefs: true, sortKeys: false }) : "";
  const json = cleaned ? JSON.stringify(cleaned, null, 2) : "";
  const markdown = error
    ? `# Failed to load\n\n\`\`\`\n${error.message}\n\`\`\``
    : yaml
      ? `\`\`\`yaml\n${yaml}\n\`\`\``
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={applicationUrl(name)}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
          />
          {yaml ? <Action.CopyToClipboard title="Copy YAML" content={yaml} /> : null}
          {json ? <Action.CopyToClipboard title="Copy JSON" content={json} /> : null}
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
