import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveWorktreeDeckCompositionRoot, type Worktree } from "../composition-root";
import { worktreeMergeTargetOptionsUsecase } from "../application/worktree-merge-target-options.usecase";
import { worktreePullRequestUsecase } from "../application/worktree-pull-request.usecase";
import { buildBranchOptions, formatExecErrorMessage, type BranchOption } from "./worktree-ui-utils";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();

/**
 * PR作成フォームを表示する
 */
export function CreatePullRequestForm({
  item,
  sourceBranch,
  onCreate,
}: {
  item: Worktree;
  sourceBranch: string;
  onCreate: (args: {
    item: Worktree;
    headBranch?: string | null;
    baseRef: string;
    title: string;
    description: string;
    draft: boolean;
    pushBeforeCreate: boolean;
  }) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [baseOptions, setBaseOptions] = useState<BranchOption[]>([]);
  const [selectedBaseRef, setSelectedBaseRef] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState(sourceBranch);
  const [isTitleDirty, setIsTitleDirty] = useState(false);
  /**
   * 自動生成したタイトルの最新値を保持する
   */
  const autoTitleRef = useRef(sourceBranch);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const selection = await worktreeMergeTargetOptionsUsecase.loadPullRequestBaseSelection({
          worktreePath: item.path,
          sourceBranch,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergeTargetOptionsDependencies,
        });
        if (cancelled) {
          return;
        }
        const options = buildBranchOptions(selection.refs);
        setBaseOptions(options);
        setSelectedBaseRef(selection.selectedRef);
        setErrorMessage(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = formatExecErrorMessage(error);
        setErrorMessage(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load base branches",
          message,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [item.path, sourceBranch]);

  useEffect(() => {
    setTitleValue(sourceBranch);
    setIsTitleDirty(false);
    autoTitleRef.current = sourceBranch;
  }, [sourceBranch]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isTitleDirty) {
        return;
      }
      const baseRef = selectedBaseRef.trim();
      if (!baseRef) {
        setTitleValue(sourceBranch);
        return;
      }
      const repoRoot = item.originPath?.trim() || item.path;
      try {
        const nextTitle = await worktreePullRequestUsecase.resolveInitialTitle({
          repoRoot,
          baseRef,
          headRef: sourceBranch,
          fallbackTitle: sourceBranch,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.resolveWorktreePullRequestTitleDependencies,
        });
        if (cancelled || isTitleDirty) {
          return;
        }
        autoTitleRef.current = nextTitle;
        setTitleValue(nextTitle);
      } catch {
        if (!cancelled) {
          autoTitleRef.current = sourceBranch;
          setTitleValue(sourceBranch);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [item.originPath, item.path, isTitleDirty, selectedBaseRef, sourceBranch]);

  const handleSubmit = useCallback(
    async (values: CreatePullRequestFormValues) => {
      const baseRef = values.baseRef?.trim();
      if (!baseRef) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Base branch is required",
        });
        return;
      }
      const title = values.title?.trim();
      if (!title) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Title is required",
        });
        return;
      }
      const dependencies = WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergeTargetOptionsDependencies;
      try {
        await dependencies.saveBaseRefForBranchConfig({ worktreePath: item.path, branch: sourceBranch, baseRef });
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save base branch",
          message,
        });
      }
      try {
        await dependencies.saveBaseRefForWorktreePath(item.path, baseRef);
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save base branch",
          message,
        });
      }
      const description = values.description?.trim() ?? "";
      const shouldClose = await onCreate({
        item,
        headBranch: sourceBranch,
        baseRef,
        title,
        description,
        draft: values.draft,
        pushBeforeCreate: values.pushBeforeCreate,
      });
      if (shouldClose) {
        pop();
      }
    },
    [item, onCreate, pop],
  );

  if (errorMessage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Failed to load base branches" description={errorMessage} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Pull Request" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Repository" text={item.repo} />
      <Form.Description title="Head Branch" text={sourceBranch} />
      <Form.Dropdown
        id="baseRef"
        title="Base Branch"
        value={selectedBaseRef}
        isLoading={isLoading}
        onChange={setSelectedBaseRef}
      >
        {baseOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Summarize the changes"
        value={titleValue}
        onChange={(value) => {
          setTitleValue(value);
          if (!isTitleDirty && value !== autoTitleRef.current) {
            setIsTitleDirty(true);
          }
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="Describe the changes" />
      <Form.Checkbox id="draft" label="Create as Draft" defaultValue={false} />
      <Form.Checkbox id="pushBeforeCreate" label="Push head branch before creating" defaultValue={true} />
    </Form>
  );
}

type CreatePullRequestFormValues = {
  baseRef: string;
  title: string;
  description: string;
  draft: boolean;
  pushBeforeCreate: boolean;
};
