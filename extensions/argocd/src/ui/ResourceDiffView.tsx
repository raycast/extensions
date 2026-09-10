/**
 * The diff of what is out of sync.
 *
 * The diff is computed in `lib/argocd/project.ts` from the two states ArgoCD returns, because
 * its own `diff` field is declared but not populated. The response is streamed and the states
 * are dropped as soon as each resource is diffed, since on an application with many resources
 * those fields are the whole payload.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ResourceDiff, ResourceStatus } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { makeClient } from "./deps";

interface Props {
  appName: string;
  appNamespace: string;
  instance: ArgoInstance;
  /** When set, only this resource is requested, which keeps the common case small. */
  resource?: ResourceStatus;
}

function describe(diff: ResourceDiff): string {
  const identity = [diff.namespace, diff.name].filter(Boolean).join("/");
  return `${diff.kind || "Resource"} ${identity}`;
}

/**
 * The fence language. `diff` activates Raycast's diff grammar, which is what colours the `@@`
 * hunk headers, but its theme does not appear to tint the `+` and `-` lines themselves. There
 * is no way to set a colour from markdown, so this is a constant to make the alternative
 * (`patch`, an alias of the same grammar in most highlighters) a one-line change if a Raycast
 * release ever styles one and not the other.
 */
const FENCE = "diff";

function stats(diff: ResourceDiff): string {
  if (diff.tooLarge) {
    return "too large to diff";
  }
  const parts = [
    diff.added > 0 ? `+${diff.added}` : undefined,
    diff.removed > 0 ? `-${diff.removed}` : undefined,
  ];
  return parts.filter(Boolean).join(" ");
}

function render(diffs: ResourceDiff[] | undefined, isLoading: boolean, resource?: ResourceStatus): string {
  if (isLoading && !diffs) {
    return "Loading the diff...";
  }

  const modified = (diffs ?? []).filter((diff) => diff.modified);
  if (modified.length === 0) {
    return [
      resource ? `# ${resource.kind} ${resource.name}` : "# No difference",
      "",
      diffs && diffs.length > 0
        ? `Comparing the desired state against the live one found no difference across ${diffs.length} managed resource${diffs.length === 1 ? "" : "s"}. An application can still be out of sync when the difference is a resource present on one side only, which the resources view shows.`
        : "ArgoCD returned no managed resource for this application.",
    ].join("\n");
  }

  const lines: string[] = [];

  if (!resource) {
    // With several resources the hunks run well past one screen, so the counts come first:
    // they are what decides which one is worth scrolling to. This also carries the added and
    // removed signal without depending on colour, which Raycast does not give the diff lines.
    lines.push(`# ${modified.length} resource${modified.length === 1 ? "" : "s"} differ`, "");
    if (modified.length > 1) {
      for (const diff of modified) {
        const summary = stats(diff);
        lines.push(`- **${describe(diff)}**${summary ? ` ${summary}` : ""}`);
      }
      lines.push("");
    }
  }

  for (const diff of modified) {
    const summary = stats(diff);
    lines.push(`## ${describe(diff)}${summary ? ` (${summary})` : ""}`, "");
    if (diff.tooLarge) {
      lines.push(
        "The manifest is past the diff line limit, so it was not compared. Open it in ArgoCD to see the difference.",
        "",
      );
      continue;
    }
    lines.push(`\`\`\`${FENCE}`, diff.diff.trimEnd(), "```", "");
  }
  return lines.join("\n");
}

export function ResourceDiffView({ appName, appNamespace, instance, resource }: Props) {
  const {
    data: diffs,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (name: string, namespace: string, target: ResourceStatus | undefined) =>
      makeClient(instance).getManagedResources(name, namespace, target),
    [appName, appNamespace, resource],
    { keepPreviousData: true },
  );

  const title = resource ? `Diff of ${resource.kind} ${resource.name}` : `Diff of ${appName}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={error ? `# Could not load the diff\n\n${error.message}` : render(diffs, isLoading, resource)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={
              resource
                ? makeClient(instance).resourceUrl(appName, appNamespace, resource)
                : makeClient(instance).appUrl(appName, appNamespace)
            }
          />
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
          {diffs && diffs.length > 0 ? (
            <Action.CopyToClipboard
              title="Copy Diff"
              content={diffs
                .filter((diff) => diff.modified)
                .map((diff) => `# ${describe(diff)}\n${diff.diff}`)
                .join("\n\n")}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
