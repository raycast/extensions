import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { dump as yamlDump } from "js-yaml";
import { getResourceManifest, ResourceRef, resourceUrl } from "./argocd";
import { stripNoise } from "./manifest";

function toYaml(manifest: string): string {
  if (!manifest) return "# (empty manifest)";
  try {
    const obj = stripNoise(JSON.parse(manifest));
    return yamlDump(obj, { lineWidth: 120, noRefs: true, sortKeys: false });
  } catch {
    return manifest;
  }
}

export function ResourceManifest({ appName, ref }: { appName: string; ref: ResourceRef }) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (n: string, r: ResourceRef) => getResourceManifest(n, r),
    [appName, ref],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load manifest", message: err.message });
      },
    },
  );

  const title = `${ref.kind}/${ref.name}`;
  const yaml = data !== undefined ? toYaml(data) : "";
  const markdown = error
    ? `# Failed to load\n\n\`\`\`\n${error.message}\n\`\`\``
    : yaml
      ? `\`\`\`yaml\n${yaml}\n\`\`\``
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={resourceUrl(appName, ref)}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
          />
          {yaml ? <Action.CopyToClipboard title="Copy YAML" content={yaml} /> : null}
          {data ? <Action.CopyToClipboard title="Copy JSON" content={data} /> : null}
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
