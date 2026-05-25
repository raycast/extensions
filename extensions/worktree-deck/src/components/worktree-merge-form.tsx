import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { resolveWorktreeDeckCompositionRoot, type Worktree } from "../composition-root";
import { worktreeMergeTargetOptionsUsecase } from "../application/worktree-merge-target-options.usecase";
import { buildBranchOptions, formatExecErrorMessage, type BranchOption } from "./worktree-ui-utils";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();

/**
 * worktree マージ先選択フォームを表示する
 */
export function MergeWorktreeForm({
  item,
  onMerge,
}: {
  item: Worktree;
  onMerge: (args: { item: Worktree; targetRef: string }) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [targetOptions, setTargetOptions] = useState<BranchOption[]>([]);
  const [selectedTargetRef, setSelectedTargetRef] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const branchName = item.branch?.trim() ?? "";
        const storedBaseRef = await worktreeMergeTargetOptionsUsecase.loadStoredBaseRef({
          worktreePath: item.path,
          branch: branchName,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergeTargetOptionsDependencies,
        });
        if (cancelled) {
          return;
        }
        if (storedBaseRef !== null && storedBaseRef.length > 0) {
          setTargetOptions(buildBranchOptions([storedBaseRef]));
          setSelectedTargetRef(storedBaseRef);
        }
        const selection = await worktreeMergeTargetOptionsUsecase.loadMergeTargetSelection({
          worktreePath: item.path,
          branch: branchName,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergeTargetOptionsDependencies,
        });
        if (cancelled) {
          return;
        }
        const options = buildBranchOptions(selection.refs);
        setTargetOptions(options);
        setSelectedTargetRef(selection.selectedRef);
        setErrorMessage(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = formatExecErrorMessage(error);
        setErrorMessage(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load merge targets",
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
  }, [item.path]);

  const handleSubmit = useCallback(
    async (values: MergeWorktreeFormValues) => {
      const targetRef = values.targetRef?.trim();
      if (!targetRef) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Target branch is required",
        });
        return;
      }
      const branchName = item.branch?.trim() ?? "";
      const dependencies = WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergeTargetOptionsDependencies;
      if (branchName) {
        try {
          await dependencies.saveBaseRefForBranchConfig({
            worktreePath: item.path,
            branch: branchName,
            baseRef: targetRef,
          });
        } catch (error) {
          const message = formatExecErrorMessage(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to save merge target",
            message,
          });
        }
      }
      try {
        await dependencies.saveBaseRefForWorktreePath(item.path, targetRef);
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save merge target",
          message,
        });
      }
      const shouldClose = await onMerge({ item, targetRef });
      if (shouldClose) {
        pop();
      }
    },
    [item, onMerge, pop],
  );

  if (errorMessage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Failed to load merge targets" description={errorMessage} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Merge Worktree" icon={Icon.ArrowRightCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Repository" text={item.repo} />
      <Form.Description title="Source Branch" text={item.branch ?? "not detected"} />
      <Form.Dropdown
        id="targetRef"
        title="Target Branch"
        value={selectedTargetRef}
        isLoading={isLoading}
        onChange={setSelectedTargetRef}
      >
        {targetOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

type MergeWorktreeFormValues = {
  targetRef: string;
};
