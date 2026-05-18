import { Action, ActionPanel, Detail } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

import { jsrUrls } from "@/lib/jsrUrls";

import { usePackage, useReadme } from "@/hooks/jsrApi";

import PackageMetadata from "@/components/PackageMetadata";

const Readme = ({ item }: { item: SearchResultDocument }) => {
  const { data: pkg, isLoading: pkgLoading } = usePackage(item);

  const latestVersion = pkg?.latestVersion ?? null;
  const hasReadmeFile = pkg?.readmeSource === "readme";
  const readmePath = hasReadmeFile ? "/README.md" : null;

  const { data: readme, isLoading: readmeLoading } = useReadme(item.scope, item.name, latestVersion, readmePath);

  const fallback = `# ${item.id}\n\n${item.description}\n\n_No README is published for this package._`;
  const markdown = hasReadmeFile ? (readme ?? "Loading…") : fallback;

  return (
    <Detail
      navigationTitle={item.id}
      isLoading={pkgLoading || readmeLoading}
      markdown={markdown}
      metadata={<PackageMetadata item={item} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on JSR" icon={{ source: "jsr.svg" }} url={jsrUrls.site.package(item.id)} />
          <Action.OpenInBrowser
            title="Open Docs (JSR)"
            url={jsrUrls.site.packageDocs(item.id)}
            shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
          />
        </ActionPanel>
      }
    />
  );
};

export default Readme;
