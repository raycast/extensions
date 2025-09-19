import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runAz } from "./az-cli";
import ActivateAndBranchForm from "./ActivateAndBranchForm";
import PullRequestDetailsView from "./PullRequestDetailsView";
import {
  activateAndCreatePR,
  convertToBranchName,
  findExistingBranchesForWorkItem,
} from "./azure-devops";
import {
  getRelatedWorkItems,
  getWorkItemComments,
  WorkItemComment,
} from "./azure-devops";
import LinkUserStoryToFeature from "./LinkUserStoryToFeature";
import {
  WorkItemDetails,
  WorkItemRelationsData,
  Preferences,
} from "./types/work-item";
import {
  generateWorkItemMarkdown,
  cleanDescription,
} from "./components/WorkItemMetadata";
import { generateRelationsMarkdown } from "./components/WorkItemRelations";
import WorkItemActions from "./components/WorkItemActions";
import AddCommentForm from "./components/AddCommentForm";
import RelatedItemsList from "./components/RelatedItemsList";

interface Props {
  workItemId: string;
  initialTitle?: string;
}

export default function WorkItemDetailsView({
  workItemId,
  initialTitle,
}: Props) {
  console.log("[WIDetails] render start", { workItemId });
  const [isLoading, setIsLoading] = useState(true);
  const [workItem, setWorkItem] = useState<WorkItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActivatingAndCreatingPR, setIsActivatingAndCreatingPR] =
    useState(false);
  const [existingPR, setExistingPR] = useState<{
    pullRequestId: number;
    title: string;
    project: string;
  } | null>(null);
  const [isCheckingPR, setIsCheckingPR] = useState(false);
  const [relatedBranches, setRelatedBranches] = useState<string[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [relations, setRelations] = useState<WorkItemRelationsData>({
    parentItem: null,
    siblingItems: [],
    relatedItems: [],
    childItems: [],
  });
  const [commentsCount, setCommentsCount] = useState<number | null>(null);
  const [comments, setComments] = useState<WorkItemComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const { push } = useNavigation();

  // WorkItemLite imported from utils

  async function fetchWorkItemDetails() {
    console.log("[WIDetails] fetchWorkItemDetails start", { workItemId });
    setIsLoading(true);
    setError(null);

    try {
      const preferences = getPreferenceValues<Preferences>();

      // Fetch detailed work item information
      const { stdout: workItemJson } = await runAz([
        "boards",
        "work-item",
        "show",
        "--id",
        workItemId,
        "--output",
        "json",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
      ]);
      const workItemData: WorkItemDetails = JSON.parse(workItemJson);
      console.log("[WIDetails] fetched", {
        id: workItemData?.id,
        title: workItemData?.fields?.["System.Title"],
      });
      setWorkItem(workItemData);
    } catch (error) {
      const errorMessage = "Failed to fetch work item details";
      setError(errorMessage);
      await showToast(Toast.Style.Failure, "Error", errorMessage);
      console.error(error);
    } finally {
      console.log("[WIDetails] fetchWorkItemDetails end");
      setIsLoading(false);
    }
  }

  async function fetchRelatedItems() {
    if (!workItem) return;
    console.log("[WIDetails] fetchRelatedItems start");
    setIsLoadingRelations(true);
    try {
      const { parent, siblings, related, children } = await getRelatedWorkItems(
        workItem.id,
      );
      setRelations({
        parentItem: parent,
        siblingItems: siblings,
        relatedItems: related,
        childItems: children,
      });
      console.log("[WIDetails] relations", {
        parent: parent?.id,
        siblings: siblings.length,
        related: related.length,
        children: children.length,
      });
    } catch {
      console.log("Failed to fetch related items:");
      setRelations({
        parentItem: null,
        siblingItems: [],
        relatedItems: [],
        childItems: [],
      });
    } finally {
      console.log("[WIDetails] fetchRelatedItems end");
      setIsLoadingRelations(false);
    }
  }

  async function handleCopyContextForAI() {
    if (!workItem) return;

    try {
      const { parent, siblings, related, children } = await getRelatedWorkItems(
        workItem.id,
      );

      const selfTitle = workItem.fields["System.Title"];
      const selfDesc = cleanDescription(workItem.fields["System.Description"]);

      let context = `#${workItem.id}: ${selfTitle}`;
      if (selfDesc) {
        context += `\n\nDescription:\n${selfDesc}`;
      }

      const lines: string[] = [];
      if (parent) {
        const pDesc = cleanDescription(parent.description);
        lines.push(
          `Parent #${parent.id}: ${parent.title}${pDesc ? `\n${pDesc}` : ""}`,
        );
      }
      if (siblings.length) {
        lines.push("Siblings:");
        siblings.forEach((s) => {
          const sDesc = cleanDescription(s.description);
          lines.push(`- #${s.id}: ${s.title}${sDesc ? `\n  ${sDesc}` : ""}`);
        });
      }
      if (related.length) {
        lines.push("Related:");
        related.forEach((r) => {
          const rDesc = cleanDescription(r.description);
          lines.push(`- #${r.id}: ${r.title}${rDesc ? `\n  ${rDesc}` : ""}`);
        });
      }

      if (children.length) {
        lines.push("Children:");
        children.forEach((c) => {
          const cDesc = cleanDescription(c.description);
          lines.push(`- #${c.id}: ${c.title}${cDesc ? `\n  ${cDesc}` : ""}`);
        });
      }

      if (lines.length) {
        context += `\n\nThis is related information:\n${lines.join("\n\n")}`;
      }

      await Clipboard.copy(context);
      await showToast(Toast.Style.Success, "Copied AI context");
    } catch (e) {
      console.error("Failed to build AI context", e);
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Could not copy AI context",
      );
    }
  }

  async function checkForExistingPR() {
    console.log("[WIDetails] checkForExistingPR start");
    if (!workItem) return;

    setIsCheckingPR(true);

    try {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.azureOrganization || !preferences.azureProject) {
        return;
      }

      // Expected branch based on current user's prefix
      const expectedBranch = convertToBranchName(
        workItem.id.toString(),
        workItem.fields["System.Title"],
        preferences.branchPrefix,
      );

      // Also look for any other branches for this WI
      const found = await findExistingBranchesForWorkItem(
        workItem.id.toString(),
        workItem.fields["System.Title"],
      );
      setRelatedBranches(found);

      const branchesToCheck = Array.from(new Set([expectedBranch, ...found]));

      const repositoryName =
        preferences.azureRepository || preferences.azureProject;

      // Search for active PRs from any of the candidate branches
      for (const sourceBranch of branchesToCheck) {
        try {
          const { stdout: prResult } = await runAz([
            "repos",
            "pr",
            "list",
            "--source-branch",
            sourceBranch,
            "--status",
            "active",
            "--output",
            "json",
            "--organization",
            preferences.azureOrganization!,
            "--project",
            preferences.azureProject!,
            "--repository",
            repositoryName,
          ]);
          const prs = JSON.parse(prResult);
          if (prs && prs.length > 0) {
            const pr = prs[0];
            setExistingPR({
              pullRequestId: pr.pullRequestId,
              title: pr.title,
              project:
                pr.repository?.project?.name ||
                preferences.azureProject ||
                "Unknown",
            });
            console.log("[WIDetails] found PR", pr.pullRequestId);
            return; // Found a PR; we can stop checking further
          }
        } catch (e) {
          // Ignore per-branch failures and continue
          console.log("PR check failed for branch", sourceBranch, e);
        }
      }

      // No PRs found across any branches
      setExistingPR(null);
    } catch (error) {
      // Silently fail - PR checking is optional
      console.log("Could not check for existing PRs:", error);
      setExistingPR(null);
    } finally {
      console.log("[WIDetails] checkForExistingPR end");
      setIsCheckingPR(false);
    }
  }

  function getWorkItemUrl(): string {
    if (!workItem) return "";

    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization) return "";

    const projectFromWorkItem = workItem.fields["System.TeamProject"];
    const projectToUse =
      projectFromWorkItem || preferences.azureProject || "Unknown";

    return `${preferences.azureOrganization}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItem.id}`;
  }

  function generateMarkdown(): string {
    if (!workItem) return "Loading work item details...";

    const metadataMarkdown = generateWorkItemMarkdown({
      workItem,
      commentsCount,
      relatedBranches,
    });

    const relationsMarkdown = generateRelationsMarkdown({
      workItem,
      relations,
      isLoadingRelations,
      comments,
      isLoadingComments,
    });

    return metadataMarkdown + relationsMarkdown;
  }

  async function handleActivateAndCreatePR() {
    if (!workItem) return;

    setIsActivatingAndCreatingPR(true);

    try {
      const result = await activateAndCreatePR(workItem.id.toString());

      if (result.success && result.prResult) {
        // Navigate to PR details view
        push(
          <PullRequestDetailsView
            pullRequestId={result.prResult.pullRequestId.toString()}
            initialTitle={result.prResult.title}
            project={result.prResult.project}
          />,
        );
      }
    } catch (error) {
      console.error("Failed to activate and create PR:", error);
    } finally {
      setIsActivatingAndCreatingPR(false);
    }
  }

  function handleOpenExistingPR() {
    if (!existingPR) return;

    push(
      <PullRequestDetailsView
        pullRequestId={existingPR.pullRequestId.toString()}
        initialTitle={existingPR.title}
        project={existingPR.project}
      />,
    );
  }

  useEffect(() => {
    fetchWorkItemDetails();
  }, [workItemId]);

  useEffect(() => {
    if (workItem) {
      checkForExistingPR();
    }
  }, [workItem]);

  async function fetchComments() {
    if (!workItem) return;
    console.log("[WIDetails] fetchComments start");
    setIsLoadingComments(true);
    try {
      const fetchedComments = await getWorkItemComments(workItem.id);
      setComments(fetchedComments);
      setCommentsCount(fetchedComments.length);
      console.log("[WIDetails] fetched", fetchedComments.length, "comments");
    } catch (e) {
      console.log("Failed to fetch comments:", e);
      setComments([]);
    } finally {
      console.log("[WIDetails] fetchComments end");
      setIsLoadingComments(false);
    }
  }

  useEffect(() => {
    if (workItem) {
      fetchRelatedItems();
      fetchComments();
    }
  }, [workItem]);

  const workItemUrl = getWorkItemUrl();
  const preferences = getPreferenceValues<Preferences>();
  const branchName = workItem
    ? convertToBranchName(
        workItem.id.toString(),
        workItem.fields["System.Title"],
        preferences.branchPrefix,
      )
    : "";

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nWork Item ID: ${workItemId}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={fetchWorkItemDetails}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading || isActivatingAndCreatingPR || isCheckingPR}
      markdown={generateMarkdown()}
      navigationTitle={initialTitle || `Work Item #${workItemId}`}
      actions={
        <WorkItemActions
          workItem={workItem}
          existingPR={existingPR}
          workItemUrl={workItemUrl}
          branchName={branchName}
          relations={relations}
          onRefresh={fetchWorkItemDetails}
          onActivateAndCreatePR={handleActivateAndCreatePR}
          onActivateAndBranch={() =>
            push(
              <ActivateAndBranchForm
                initialWorkItemId={workItem?.id.toString() || workItemId}
              />,
            )
          }
          onCopyContextForAI={handleCopyContextForAI}
          onAddComment={() =>
            push(
              <AddCommentForm
                workItemId={workItem?.id || parseInt(workItemId)}
                onPosted={async () => {
                  if (workItem) {
                    await fetchComments();
                  }
                }}
              />,
            )
          }
          onLinkToFeature={
            workItem
              ? () =>
                  push(
                    <LinkUserStoryToFeature
                      workItemId={workItem.id}
                      onLinked={() => {
                        fetchRelatedItems();
                        fetchWorkItemDetails();
                      }}
                    />,
                  )
              : undefined
          }
          onOpenExistingPR={handleOpenExistingPR}
          onBrowseRelated={() =>
            push(
              <RelatedItemsList
                parentItem={relations.parentItem}
                siblingItems={relations.siblingItems}
                relatedItems={relations.relatedItems}
                childItems={relations.childItems}
                onOpenWorkItem={(id, title) =>
                  push(
                    <WorkItemDetailsView
                      workItemId={String(id)}
                      initialTitle={title}
                    />,
                  )
                }
              />,
            )
          }
        />
      }
    />
  );
}
