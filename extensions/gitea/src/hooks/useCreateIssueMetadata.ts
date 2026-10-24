import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getCreateIssueMetadata } from "../services/issues";

export function useCreateIssueMetadata(owner?: string, repo?: string) {
  const { data, isLoading } = useCachedPromise(
    async (o?: string, r?: string) => {
      const metadata = await getCreateIssueMetadata({ owner: o, repo: r });
      if (metadata.metadataFailures.length > 0) {
        await showFailureToast(createMetadataError(metadata.metadataFailures.map((failure) => failure.reason)), {
          title: `Failed to load ${formatMetadataFailureFields(metadata.metadataFailures.map((failure) => failure.field))}`,
        });
      }
      return metadata;
    },
    [owner, repo] as [string | undefined, string | undefined],
    {
      keepPreviousData: true,
      initialData: { labels: [], milestones: [], assignees: [], metadataFailures: [] },
    },
  );

  return { metadata: data, isLoading };
}

function formatMetadataFailureFields(fields: string[]): string {
  return [...new Set(fields)].join(", ");
}

function createMetadataError(reasons: unknown[]): Error {
  const message = reasons
    .map((reason) => (reason instanceof Error ? reason.message : String(reason)))
    .filter(Boolean)
    .join("; ");

  return new Error(message || "Some issue metadata could not be loaded");
}
