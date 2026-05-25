import {
  Action,
  ActionPanel,
  Form,
  Grid,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  environment,
  showToast,
  type Keyboard,
  useNavigation,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendUniqueImagePaths,
  autoStartImageInputUsecase,
  formatAutoStartImagePathsText,
  normalizeAutoStartImagePaths,
  parseAutoStartImagePathsText,
} from "../application/auto-start-image-input.usecase";
import { createWorktreeUsecase, type WorktreeCreateContext } from "../application/create-worktree.usecase";
import { startWorktreeAutoStartJobUsecase } from "../application/start-worktree-auto-start-job.usecase";
import {
  resolveCodexPermissionMetadata,
  resolveCodexPermissionMode,
  startCodexInitialSessionUsecase,
  type CodexInitialSessionMetadata,
  type CodexPermissionMode,
  type CodexPermissionMetadata,
  type CodexReasoningEffort,
  type CodexServiceTier,
} from "../application/start-codex-initial-session.usecase";
import { worktreeOpenAppUsecase } from "../application/worktree-open-app.usecase";
import { resolveWorktreeDeckCompositionRoot } from "../composition-root";
import { type RepositoryMapping } from "../domain/repository-mapping.service";
import { type WorktreeIdeApp } from "../domain/worktree-ide-app.service";
import { type WorktreeOpenApp } from "../domain/worktree-open-app.service";
import { resolveOpenAppIcon, resolveOpenAppTitle } from "./worktree-open-app-icon";
import { buildBranchOptions, formatExecErrorMessage, type BranchOption } from "./worktree-ui-utils";

const CREATE_WORKTREE_FORM_ITEM_IDS = {
  initialPrompt: "initialPrompt",
  imagePaths: "imagePaths",
  model: "model",
  serviceTier: "serviceTier",
  reasoningEffort: "reasoningEffort",
  permissions: "permissions",
  branch: "branch",
  spacing: "spacing",
  repoRoot: "repoRoot",
  baseBranch: "baseBranch",
  baseBranchError: "baseBranchError",
  openApp: "openApp",
} as const;

type CreateWorktreeFormItemId = (typeof CREATE_WORKTREE_FORM_ITEM_IDS)[keyof typeof CREATE_WORKTREE_FORM_ITEM_IDS];

type CreateWorktreeFocusableItemId = Exclude<
  CreateWorktreeFormItemId,
  | typeof CREATE_WORKTREE_FORM_ITEM_IDS.imagePaths
  | typeof CREATE_WORKTREE_FORM_ITEM_IDS.spacing
  | typeof CREATE_WORKTREE_FORM_ITEM_IDS.baseBranchError
>;

/**
 * プレビュー画面から戻った後にフォーム focus を戻す待機時間
 */
const CREATE_WORKTREE_FORM_FOCUS_RESTORE_DELAY_MS = 0;

/**
 * Create Worktree フォームで focus 復元できる item ID
 */
const CREATE_WORKTREE_FOCUSABLE_ITEM_IDS: readonly CreateWorktreeFocusableItemId[] = [
  CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt,
  CREATE_WORKTREE_FORM_ITEM_IDS.model,
  CREATE_WORKTREE_FORM_ITEM_IDS.serviceTier,
  CREATE_WORKTREE_FORM_ITEM_IDS.reasoningEffort,
  CREATE_WORKTREE_FORM_ITEM_IDS.permissions,
  CREATE_WORKTREE_FORM_ITEM_IDS.branch,
  CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot,
  CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch,
  CREATE_WORKTREE_FORM_ITEM_IDS.openApp,
];

/**
 * Create Worktree フォームの既定 Auto Start 状態
 */
export const DEFAULT_CREATE_WORKTREE_AUTO_START = true;

/**
 * Create Worktree フォームの入力ドラフト保存キー
 */
export const CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS = {
  autoStart: "worktree-deck.create-worktree-form.auto-start",
  initialPrompt: "worktree-deck.create-worktree-form.initial-prompt",
  imagePathsText: "worktree-deck.create-worktree-form.image-paths-text",
  model: "worktree-deck.create-worktree-form.codex-model",
  serviceTier: "worktree-deck.create-worktree-form.codex-service-tier",
  reasoningEffort: "worktree-deck.create-worktree-form.codex-reasoning-effort",
  permissions: "worktree-deck.create-worktree-form.codex-permissions",
  approvalPolicy: "worktree-deck.create-worktree-form.codex-approval-policy",
  sandboxMode: "worktree-deck.create-worktree-form.codex-sandbox-mode",
  approvalsReviewer: "worktree-deck.create-worktree-form.codex-approvals-reviewer",
  webSearch: "worktree-deck.create-worktree-form.codex-web-search",
  branch: "worktree-deck.create-worktree-form.branch",
  openApp: "worktree-deck.create-worktree-form.open-app",
} as const;

/**
 * Create Worktree フォームの既定起動アプリ
 */
const DEFAULT_CREATE_WORKTREE_OPEN_APP: WorktreeOpenApp = "zed";

/**
 * Codex 初回セッションの既定メタ情報
 */
const DEFAULT_CODEX_INITIAL_SESSION_METADATA: CodexInitialSessionMetadata = {
  model: "gpt-5.5",
  serviceTier: "default",
  reasoningEffort: "medium",
  approvalPolicy: "on-request",
  sandboxMode: "workspace-write",
  approvalsReviewer: "user",
  webSearch: "cached",
};

/**
 * Codex モデル選択肢
 */
const CODEX_MODEL_OPTIONS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex", "gpt-5.3-codex-spark", "gpt-5.2"];

/**
 * worktree 作成ユースケースで使う既定依存
 */
const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();
const { loadRepositoryMappings } = WORKTREE_DECK_COMPOSITION_ROOT.repositoryMappingStore;
const {
  listLocalBranches,
  loadDefaultBaseRef,
  saveBaseRefForBranchConfig,
  saveBaseRefForWorktreePath,
  saveOpenAppForWorktreePath,
} = WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeFormDependencies;
const { autoStartImageInputDependencies } = WORKTREE_DECK_COMPOSITION_ROOT;

/**
 * クリップボード画像添付のショートカット
 */
const ATTACH_CLIPBOARD_IMAGE_SHORTCUT = { modifiers: ["cmd", "shift"], key: "c" } satisfies Keyboard.Shortcut;

/**
 * 最新スクリーンショット添付のショートカット
 */
const ATTACH_LATEST_SCREENSHOT_IMAGE_SHORTCUT = {
  modifiers: ["cmd", "shift"],
  key: "s",
} satisfies Keyboard.Shortcut;

/**
 * Finder 選択画像添付のショートカット
 */
const ATTACH_SELECTED_FINDER_IMAGES_SHORTCUT = { modifiers: ["cmd", "shift"], key: "f" } satisfies Keyboard.Shortcut;

/**
 * 画像添付処理を呼び出し順に直列実行するランナーを作成する
 */
export function createSequentialImageAttachmentRunner(): <T>(operation: () => Promise<T>) => Promise<T> {
  let queue = Promise.resolve();
  return async function runSequentially<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

/**
 * worktree を指定アプリで開く
 */
async function openPathInPreferredApp(path: string, openApp: WorktreeOpenApp): Promise<void> {
  await worktreeOpenAppUsecase.openPreferred({
    command: { worktreePath: path, openApp },
    dependencies: WORKTREE_DECK_COMPOSITION_ROOT.openWorktreeInPreferredAppDependencies,
  });
}

/**
 * worktree 作成フォームを表示する
 */
export function CreateWorktreeForm({
  initialRepoRoot,
  onAttempt,
  onComplete,
}: {
  initialRepoRoot?: string | null;
  onAttempt?: () => void;
  onComplete?: () => void;
}) {
  const { pop, push } = useNavigation();
  const [effectiveInitialRepoRoot] = useState<string | null>(() => initialRepoRoot ?? null);
  const [repoOptions, setRepoOptions] = useState<RepoOption[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [baseBranchOptions, setBaseBranchOptions] = useState<BranchOption[]>([]);
  const [selectedBaseBranch, setSelectedBaseBranch] = useState<string>("");
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [branchErrorMessage, setBranchErrorMessage] = useState<string | null>(null);
  const [autoStartDraft, setAutoStartDraft] = useCachedState<boolean>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.autoStart,
    DEFAULT_CREATE_WORKTREE_AUTO_START,
  );
  const [initialPromptDraft, setInitialPromptDraft] = useCachedState<string>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.initialPrompt,
    "",
  );
  const [imagePathsTextDraft, setImagePathsTextDraft] = useCachedState<string>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.imagePathsText,
    "",
  );
  const [modelDraft, setModelDraft] = useCachedState<string>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.model,
    DEFAULT_CODEX_INITIAL_SESSION_METADATA.model,
  );
  const [serviceTierDraft, setServiceTierDraft] = useCachedState<CodexServiceTier>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.serviceTier,
    DEFAULT_CODEX_INITIAL_SESSION_METADATA.serviceTier,
  );
  const [reasoningEffortDraft, setReasoningEffortDraft] = useCachedState<CodexReasoningEffort>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.reasoningEffort,
    DEFAULT_CODEX_INITIAL_SESSION_METADATA.reasoningEffort,
  );
  const [permissionsDraft, setPermissionsDraft] = useCachedState<CodexPermissionMode>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.permissions,
    "default",
  );
  const [customPermissionMetadataDraft, setCustomPermissionMetadataDraft] = useState<CodexPermissionMetadata>({
    approvalPolicy: DEFAULT_CODEX_INITIAL_SESSION_METADATA.approvalPolicy,
    sandboxMode: DEFAULT_CODEX_INITIAL_SESSION_METADATA.sandboxMode,
    approvalsReviewer: DEFAULT_CODEX_INITIAL_SESSION_METADATA.approvalsReviewer,
    webSearch: DEFAULT_CODEX_INITIAL_SESSION_METADATA.webSearch,
  });
  const [branchDraft, setBranchDraft] = useCachedState<string>(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.branch, "");
  const [openAppDraft, setOpenAppDraft] = useCachedState<WorktreeOpenApp>(
    CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.openApp,
    DEFAULT_CREATE_WORKTREE_OPEN_APP,
  );
  const [preferredIdeApp, setPreferredIdeApp] = useState<WorktreeIdeApp>("zed");
  const [scriptPath, setScriptPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const focusedFormItemIdRef = useRef<CreateWorktreeFocusableItemId>(CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt);
  const initialPromptRef = useRef<Form.TextArea>(null);
  const modelRef = useRef<Form.Dropdown>(null);
  const serviceTierRef = useRef<Form.Dropdown>(null);
  const reasoningEffortRef = useRef<Form.Dropdown>(null);
  const permissionsRef = useRef<Form.Dropdown>(null);
  const branchRef = useRef<Form.TextField>(null);
  const repoRootRef = useRef<Form.Dropdown>(null);
  const baseBranchRef = useRef<Form.Dropdown>(null);
  const openAppRef = useRef<Form.Dropdown>(null);

  /**
   * General Settings の IDE 設定を読み込む
   */
  useEffect(() => {
    let active = true;
    async function loadPreferredIdeAppSetting(): Promise<void> {
      try {
        const loadedIdeApp = await WORKTREE_DECK_COMPOSITION_ROOT.generalSettingsStore.loadPreferredIdeApp();
        if (active) {
          setPreferredIdeApp(loadedIdeApp);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load IDE setting",
          message: formatExecErrorMessage(error),
        });
      }
    }
    void loadPreferredIdeAppSetting();
    return () => {
      active = false;
    };
  }, []);

  const recordFocusedFormItem = useCallback((itemId: CreateWorktreeFocusableItemId) => {
    focusedFormItemIdRef.current = itemId;
  }, []);

  const focusCreateWorktreeFormItem = useCallback((itemId: CreateWorktreeFocusableItemId) => {
    const refs = {
      [CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt]: initialPromptRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.model]: modelRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.serviceTier]: serviceTierRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.reasoningEffort]: reasoningEffortRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.permissions]: permissionsRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.branch]: branchRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot]: repoRootRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch]: baseBranchRef,
      [CREATE_WORKTREE_FORM_ITEM_IDS.openApp]: openAppRef,
    } satisfies Record<CreateWorktreeFocusableItemId, { current: { focus: () => void } | null }>;

    refs[itemId].current?.focus();
  }, []);

  const restoreCreateWorktreeFormFocus = useCallback(() => {
    const itemId = resolveCreateWorktreeFormFocusRestoreItemId({
      itemId: focusedFormItemIdRef.current,
      autoStart: autoStartDraft,
      hasBaseBranchError: Boolean(branchErrorMessage),
    });

    setTimeout(() => {
      focusCreateWorktreeFormItem(itemId);
    }, CREATE_WORKTREE_FORM_FOCUS_RESTORE_DELAY_MS);
  }, [autoStartDraft, branchErrorMessage, focusCreateWorktreeFormItem]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const paths = await createWorktreeUsecase.resolvePaths({
          context: buildWorktreeCreateContext(),
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeDependencies,
        });
        const mappings = await loadRepositoryMappings();
        if (mappings.length === 0) {
          throw new Error("Repository mappings were not found.");
        }
        const options = buildRepoOptions(mappings);
        const initialRepo = resolveInitialRepoDropdownValue({
          initialRepoRoot: effectiveInitialRepoRoot,
          options,
          mappings,
        });
        if (cancelled) {
          return;
        }
        setRepoOptions(options);
        setScriptPath(paths.scriptPath);
        setSelectedRepo(initialRepo);
        setErrorMessage(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        setErrorMessage(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load repositories",
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
  }, [effectiveInitialRepoRoot]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedRepo) {
        setBaseBranchOptions([]);
        setSelectedBaseBranch("");
        setBranchErrorMessage(null);
        return;
      }
      setBaseBranchOptions([]);
      setSelectedBaseBranch("");
      setIsBranchesLoading(true);
      try {
        const [branches, defaultBaseRef] = await Promise.all([
          listLocalBranches(selectedRepo),
          loadDefaultBaseRef(selectedRepo).catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        const options = buildBaseBranchOptions({ branches, defaultBaseRef });
        setBaseBranchOptions(options);
        setSelectedBaseBranch(
          resolveDefaultBaseBranchValue({
            defaultBaseRef,
            optionValues: options.map((option) => option.value),
          }),
        );
        setBranchErrorMessage(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        setBranchErrorMessage(message);
        setBaseBranchOptions([]);
        setSelectedBaseBranch("");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load branches",
          message,
        });
      } finally {
        if (!cancelled) {
          setIsBranchesLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedRepo]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!autoStartDraft || !selectedRepo) {
        return;
      }
      try {
        const defaults = await startCodexInitialSessionUsecase.loadDefaults({
          query: { repoRoot: selectedRepo },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.startCodexInitialSessionDependencies,
        });
        if (cancelled) {
          return;
        }
        setModelDraft(defaults.model);
        setServiceTierDraft(defaults.serviceTier);
        setReasoningEffortDraft(defaults.reasoningEffort);
        setCustomPermissionMetadataDraft({
          approvalPolicy: defaults.approvalPolicy,
          sandboxMode: defaults.sandboxMode,
          approvalsReviewer: defaults.approvalsReviewer,
          webSearch: defaults.webSearch,
        });
        setPermissionsDraft(resolveCodexPermissionMode(defaults));
      } catch {
        // 既定値の読込失敗時は保持済みフォーム値をそのまま使う
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [autoStartDraft, selectedRepo, setModelDraft, setPermissionsDraft, setReasoningEffortDraft, setServiceTierDraft]);

  const handleToggleAutoStart = useCallback(() => {
    setAutoStartDraft((current) => !current);
  }, [setAutoStartDraft]);

  const imagePaths = useMemo(() => parseAutoStartImagePathsText(imagePathsTextDraft), [imagePathsTextDraft]);
  const imagePathsRef = useRef<string[]>(imagePaths);
  const runImageAttachmentSequentiallyRef = useRef(createSequentialImageAttachmentRunner());

  useEffect(() => {
    imagePathsRef.current = imagePaths;
  }, [imagePaths]);

  const handleAttachClipboardImage = useCallback(async (): Promise<string[]> => {
    return runImageAttachmentSequentiallyRef.current(async () => {
      try {
        const imagePath = await autoStartImageInputUsecase.resolveClipboardImagePath({
          existingImagePaths: imagePathsRef.current,
          dependencies: autoStartImageInputDependencies,
        });
        if (!imagePath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Clipboard image was not found",
          });
          return [];
        }
        setImagePathsTextDraft((current) => {
          const nextImagePaths = appendUniqueImagePaths(parseAutoStartImagePathsText(current), [imagePath]);
          imagePathsRef.current = nextImagePaths;
          return formatAutoStartImagePathsText(nextImagePaths);
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Clipboard image attached",
          message: basename(imagePath),
        });
        return [imagePath];
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to attach clipboard image",
          message: formatExecErrorMessage(error),
        });
        return [];
      }
    });
  }, [setImagePathsTextDraft]);

  const handleAttachLatestScreenshotImage = useCallback(async (): Promise<string[]> => {
    return runImageAttachmentSequentiallyRef.current(async () => {
      try {
        const imagePath = await autoStartImageInputUsecase.resolveLatestScreenshotImagePath({
          existingImagePaths: imagePathsRef.current,
          dependencies: autoStartImageInputDependencies,
        });
        if (!imagePath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Latest screenshot was not found",
          });
          return [];
        }
        setImagePathsTextDraft((current) => {
          const nextImagePaths = appendUniqueImagePaths(parseAutoStartImagePathsText(current), [imagePath]);
          imagePathsRef.current = nextImagePaths;
          return formatAutoStartImagePathsText(nextImagePaths);
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Latest screenshot attached",
          message: basename(imagePath),
        });
        return [imagePath];
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to attach latest screenshot",
          message: formatExecErrorMessage(error),
        });
        return [];
      }
    });
  }, [setImagePathsTextDraft]);

  const handleAttachSelectedFinderImages = useCallback(async (): Promise<string[]> => {
    return runImageAttachmentSequentiallyRef.current(async () => {
      try {
        const imagePaths = await autoStartImageInputUsecase.resolveSelectedFinderImagePaths({
          dependencies: autoStartImageInputDependencies,
        });
        if (imagePaths.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Selected Finder images were not found",
          });
          return [];
        }
        setImagePathsTextDraft((current) => {
          const nextImagePaths = appendUniqueImagePaths(parseAutoStartImagePathsText(current), imagePaths);
          imagePathsRef.current = nextImagePaths;
          return formatAutoStartImagePathsText(nextImagePaths);
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Finder images attached",
          message: `${imagePaths.length}`,
        });
        return imagePaths;
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to attach Finder images",
          message: formatExecErrorMessage(error),
        });
        return [];
      }
    });
  }, [setImagePathsTextDraft]);

  const handleClearImagePaths = useCallback(() => {
    imagePathsRef.current = [];
    setImagePathsTextDraft("");
  }, [setImagePathsTextDraft]);

  const handleRemoveImagePath = useCallback(
    (path: string) => {
      setImagePathsTextDraft((current) => {
        const nextImagePaths = parseAutoStartImagePathsText(current).filter((currentPath) => currentPath !== path);
        imagePathsRef.current = nextImagePaths;
        return formatAutoStartImagePathsText(nextImagePaths);
      });
    },
    [setImagePathsTextDraft],
  );

  const handlePreviewImagePaths = useCallback(() => {
    push(
      <ImageAttachmentsPreview
        imagePaths={imagePaths}
        onRemoveImagePath={handleRemoveImagePath}
        onClearImagePaths={handleClearImagePaths}
        onAttachClipboardImage={handleAttachClipboardImage}
        onAttachLatestScreenshotImage={handleAttachLatestScreenshotImage}
        onAttachSelectedFinderImages={handleAttachSelectedFinderImages}
      />,
      restoreCreateWorktreeFormFocus,
    );
  }, [
    handleAttachClipboardImage,
    handleAttachLatestScreenshotImage,
    handleAttachSelectedFinderImages,
    handleClearImagePaths,
    handleRemoveImagePath,
    imagePaths,
    push,
    restoreCreateWorktreeFormFocus,
  ]);

  const handleSubmit = useCallback(
    async (values: CreateWorktreeFormValues) => {
      if (isSubmitting) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Create worktree is already running",
        });
        return;
      }
      const repoRoot = values.repoRoot?.trim();
      const baseBranch = values.baseBranch?.trim();
      const autoStart = autoStartDraft;
      const initialPrompt = values.initialPrompt?.trim();
      const imagePaths = resolveCreateWorktreeFormImagePaths({
        pickerValue: values.imagePaths,
        draftText: imagePathsTextDraft,
      });
      const branch = values.branch?.trim() ?? "";
      if (!repoRoot) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Repository is required",
        });
        return;
      }
      if (isBranchesLoading) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Base branches are still loading",
        });
        return;
      }
      if (!baseBranch) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Base branch is required",
        });
        return;
      }
      if (!baseBranchOptions.some((option) => option.value === baseBranch)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Base branch is invalid",
        });
        return;
      }
      if (autoStart && !initialPrompt) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Initial prompt is required",
        });
        return;
      }
      if (autoStart) {
        const invalidImagePath = autoStartImageInputUsecase.findInvalidImagePath({
          imagePaths,
          dependencies: autoStartImageInputDependencies,
        });
        if (invalidImagePath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Image attachment is invalid",
            message: invalidImagePath,
          });
          return;
        }
      }
      if (!autoStart && !branch) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Branch name is required",
        });
        return;
      }
      const mapValue = repoOptions.find((option) => option.value === repoRoot)?.mapValue?.trim();
      if (!mapValue) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Repository mapping is required",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: autoStart ? "Starting Auto Start job" : "Creating worktree",
      });
      setIsSubmitting(true);
      if (autoStart) {
        onAttempt?.();
        pop();
        /**
         * Auto Start job の開始完了通知とフォーム後処理を行う
         */
        const runAutoStart = async () => {
          try {
            const result = await startWorktreeAutoStartJobUsecase.start({
              command: {
                repoRoot,
                baseBranch,
                initialPrompt: initialPrompt ?? "",
                imagePaths,
                scriptPath: scriptPath ?? "",
                mapValue,
                openApp: resolveCreateFormOpenApp(values.openApp),
                metadata: buildCodexInitialSessionMetadata(values, customPermissionMetadataDraft),
              },
              dependencies: WORKTREE_DECK_COMPOSITION_ROOT.startWorktreeAutoStartJobDependencies,
            });
            await resetCreateWorktreeFormDraftStorage();
            setAutoStartDraft(DEFAULT_CREATE_WORKTREE_AUTO_START);
            setInitialPromptDraft("");
            setImagePathsTextDraft("");
            setBranchDraft("");
            setOpenAppDraft(DEFAULT_CREATE_WORKTREE_OPEN_APP);
            toast.style = Toast.Style.Success;
            toast.title = "Auto Start job started";
            toast.message = result.statePath;
          } catch (error) {
            const message = formatExecErrorMessage(error);
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to start Auto Start job";
            toast.message = message;
          } finally {
            setIsSubmitting(false);
            onComplete?.();
          }
        };
        void runAutoStart();
        return;
      }

      onAttempt?.();
      pop();
      /**
       * worktree 作成の完了通知と後処理を行う
       */
      const runCreate = async () => {
        try {
          const result = await createWorktreeUsecase.create({
            command: {
              repoRoot,
              branch,
              startPoint: baseBranch,
              scriptPath: scriptPath ?? "",
              mapValue,
            },
            dependencies: WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeDependencies,
          });
          const createdPath = result.createdPath;
          const configPath = createdPath;
          try {
            await saveBaseRefForBranchConfig({ worktreePath: configPath, branch, baseRef: baseBranch });
          } catch (error) {
            const message = formatExecErrorMessage(error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to save base branch",
              message,
            });
          }
          try {
            await saveBaseRefForWorktreePath(createdPath, baseBranch);
          } catch (error) {
            const message = formatExecErrorMessage(error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to save base branch",
              message,
            });
          }
          const openApp = resolveCreateFormOpenApp(values.openApp);
          try {
            await saveOpenAppForWorktreePath(createdPath, openApp);
          } catch (error) {
            const message = formatExecErrorMessage(error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to save open app",
              message,
            });
          }
          await resetCreateWorktreeFormDraftStorage();
          setAutoStartDraft(DEFAULT_CREATE_WORKTREE_AUTO_START);
          setInitialPromptDraft("");
          setImagePathsTextDraft("");
          setBranchDraft("");
          setOpenAppDraft(DEFAULT_CREATE_WORKTREE_OPEN_APP);
          if (existsSync(createdPath)) {
            void openWorktreeWhenReady(createdPath, openApp);
          }
          toast.style = Toast.Style.Success;
          toast.title = "Worktree created";
          toast.message = `Copying untracked files in background: ${createdPath}`;
        } catch (error) {
          const message = formatExecErrorMessage(error);
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to create worktree";
          toast.message = message;
        } finally {
          setIsSubmitting(false);
          onComplete?.();
        }
      };
      void runCreate();
    },
    [
      baseBranchOptions,
      autoStartDraft,
      isBranchesLoading,
      isSubmitting,
      onAttempt,
      onComplete,
      pop,
      repoOptions,
      scriptPath,
      customPermissionMetadataDraft,
      imagePathsTextDraft,
      setBranchDraft,
      setAutoStartDraft,
      setInitialPromptDraft,
      setImagePathsTextDraft,
      setOpenAppDraft,
    ],
  );

  if (errorMessage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Failed to load repositories" description={errorMessage} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={autoStartDraft ? "Start Auto Start Job" : "Create Worktree"}
            icon={autoStartDraft ? Icon.Terminal : Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
          <Action
            title={autoStartDraft ? "Use Manual Branch" : "Use Auto Start"}
            icon={autoStartDraft ? Icon.TextCursor : Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={handleToggleAutoStart}
          />
          {autoStartDraft ? (
            <Action
              title="Attach Clipboard Image"
              icon={Icon.Image}
              shortcut={ATTACH_CLIPBOARD_IMAGE_SHORTCUT}
              onAction={() => {
                void handleAttachClipboardImage();
              }}
            />
          ) : null}
          {autoStartDraft ? (
            <Action
              title="Attach Latest Screenshot"
              icon={Icon.Image}
              shortcut={ATTACH_LATEST_SCREENSHOT_IMAGE_SHORTCUT}
              onAction={() => {
                void handleAttachLatestScreenshotImage();
              }}
            />
          ) : null}
          {autoStartDraft ? (
            <Action
              title="Attach Selected Finder Images"
              icon={Icon.Finder}
              shortcut={ATTACH_SELECTED_FINDER_IMAGES_SHORTCUT}
              onAction={() => {
                void handleAttachSelectedFinderImages();
              }}
            />
          ) : null}
          {autoStartDraft ? (
            <Action
              title="Preview Images"
              icon={Icon.Image}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={handlePreviewImagePaths}
            />
          ) : null}
          {autoStartDraft && imagePaths.length > 0 ? (
            <Action
              title="Clear Images"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={handleClearImagePaths}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {isLoading
        ? null
        : buildCreateWorktreeFormItemOrder({
            autoStart: autoStartDraft,
            hasBaseBranchError: Boolean(branchErrorMessage),
          }).map((itemId) => {
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt) {
              return (
                <Form.TextArea
                  key={itemId}
                  id="initialPrompt"
                  ref={initialPromptRef}
                  title="Initial Prompt"
                  placeholder="Describe the work to start"
                  value={initialPromptDraft}
                  onChange={setInitialPromptDraft}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt)}
                />
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.imagePaths) {
              return (
                <Form.Description
                  key={itemId}
                  title="Images"
                  text={formatImageAttachmentControlsText(imagePaths.length)}
                />
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.model) {
              return (
                <Form.Dropdown
                  key={itemId}
                  id="model"
                  ref={modelRef}
                  title="Model"
                  value={resolveCodexModel(modelDraft)}
                  onChange={setModelDraft}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.model)}
                >
                  {CODEX_MODEL_OPTIONS.map((model) => (
                    <Form.Dropdown.Item key={model} value={model} title={model} />
                  ))}
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.reasoningEffort) {
              return (
                <Form.Dropdown
                  key={itemId}
                  id="reasoningEffort"
                  ref={reasoningEffortRef}
                  title="Reasoning Effort"
                  value={reasoningEffortDraft}
                  onChange={(value) => setReasoningEffortDraft(resolveReasoningEffort(value))}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.reasoningEffort)}
                >
                  <Form.Dropdown.Item value="low" title="low" />
                  <Form.Dropdown.Item value="medium" title="medium" />
                  <Form.Dropdown.Item value="high" title="high" />
                  <Form.Dropdown.Item value="xhigh" title="xhigh" />
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.serviceTier) {
              return (
                <Form.Dropdown
                  key={itemId}
                  id="serviceTier"
                  ref={serviceTierRef}
                  title="Fast Mode"
                  value={resolveServiceTier(serviceTierDraft)}
                  onChange={(value) => setServiceTierDraft(resolveServiceTier(value))}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.serviceTier)}
                >
                  <Form.Dropdown.Item value="default" title="Off" />
                  <Form.Dropdown.Item value="fast" title="On" />
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.permissions) {
              return (
                <Form.Dropdown
                  key={itemId}
                  id="permissions"
                  ref={permissionsRef}
                  title="Permissions"
                  value={resolvePermissionsMode(permissionsDraft)}
                  onChange={(value) => setPermissionsDraft(resolvePermissionsMode(value))}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.permissions)}
                >
                  <Form.Dropdown.Item value="default" title="Default" />
                  <Form.Dropdown.Item value="auto_review" title="Auto Review" />
                  <Form.Dropdown.Item value="full_access" title="Full Access" />
                  <Form.Dropdown.Item value="custom" title="Custom (config.toml)" />
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.branch) {
              return (
                <Form.TextField
                  key={itemId}
                  id="branch"
                  ref={branchRef}
                  title="Branch Name"
                  placeholder="feature/my-branch"
                  value={branchDraft}
                  onChange={setBranchDraft}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.branch)}
                />
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.spacing) {
              return <Form.Separator key={itemId} />;
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot) {
              const repoOptionValues = repoOptions.map((option) => option.value);
              const repoDropdownValue = resolveDropdownValue({
                selectedValue: selectedRepo,
                optionValues: repoOptionValues,
              });
              return (
                <Form.Dropdown
                  key={`${itemId}:${repoDropdownValue}:${repoOptionValues.join("\n")}`}
                  id="repoRoot"
                  ref={repoRootRef}
                  title="Repository"
                  value={repoDropdownValue}
                  onChange={setSelectedRepo}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot)}
                >
                  <Form.Dropdown.Item value="" title="Select repository" />
                  {repoOptions.map((option) => (
                    <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                  ))}
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch) {
              const baseBranchOptionValues = baseBranchOptions.map((option) => option.value);
              const baseBranchDropdownValue = resolveDropdownValue({
                selectedValue: selectedBaseBranch,
                optionValues: baseBranchOptionValues,
              });
              return (
                <Form.Dropdown
                  key={`${itemId}:${selectedRepo}:${baseBranchDropdownValue}:${baseBranchOptionValues.join("\n")}`}
                  id="baseBranch"
                  ref={baseBranchRef}
                  title="Base Branch"
                  value={baseBranchDropdownValue}
                  isLoading={isBranchesLoading}
                  onChange={setSelectedBaseBranch}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch)}
                >
                  <Form.Dropdown.Item value="" title="Select base branch" />
                  {baseBranchOptions.map((option) => (
                    <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                  ))}
                </Form.Dropdown>
              );
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.baseBranchError) {
              return branchErrorMessage ? (
                <Form.Description key={itemId} title="Base Branch Error" text={branchErrorMessage} />
              ) : null;
            }
            if (itemId === CREATE_WORKTREE_FORM_ITEM_IDS.openApp) {
              return (
                <Form.Dropdown
                  key={itemId}
                  id="openApp"
                  ref={openAppRef}
                  title="Open With"
                  value={resolveCreateFormOpenApp(openAppDraft)}
                  onChange={(value) => setOpenAppDraft(resolveCreateFormOpenApp(value))}
                  onFocus={() => recordFocusedFormItem(CREATE_WORKTREE_FORM_ITEM_IDS.openApp)}
                >
                  <Form.Dropdown.Item
                    value="zed"
                    title={resolveOpenAppTitle("zed", preferredIdeApp)}
                    icon={resolveOpenAppIcon("zed")}
                  />
                  <Form.Dropdown.Item
                    value="codex-app"
                    title={resolveOpenAppTitle("codex-app")}
                    icon={resolveOpenAppIcon("codex-app")}
                  />
                </Form.Dropdown>
              );
            }
            return null;
          })}
    </Form>
  );
}

/**
 * 添付画像のフォーム表示用サマリーを返す
 */
export function formatImageAttachmentSummary(count: number): string {
  return count === 1 ? "1 image" : `${count} images`;
}

/**
 * 画像添付操作のフォーム表示テキストを返す
 */
export function formatImageAttachmentControlsText(count: number): string {
  return `${formatImageAttachmentSummary(count)} | Clipboard ⌘⇧C | Shot ⌘⇧S | Finder ⌘⇧F`;
}

type ImageAttachmentsPreviewProps = {
  imagePaths: string[];
  onRemoveImagePath: (path: string) => void;
  onClearImagePaths: () => void;
  onAttachClipboardImage: () => Promise<string[]>;
  onAttachLatestScreenshotImage: () => Promise<string[]>;
  onAttachSelectedFinderImages: () => Promise<string[]>;
};

/**
 * 添付画像をサムネイルで確認・削除する
 */
function ImageAttachmentsPreview({
  imagePaths,
  onRemoveImagePath,
  onClearImagePaths,
  onAttachClipboardImage,
  onAttachLatestScreenshotImage,
  onAttachSelectedFinderImages,
}: ImageAttachmentsPreviewProps) {
  const { pop } = useNavigation();
  const [previewImagePaths, setPreviewImagePaths] = useState(imagePaths);

  const handleRemoveImagePath = useCallback(
    (path: string) => {
      setPreviewImagePaths((current) => current.filter((currentPath) => currentPath !== path));
      onRemoveImagePath(path);
    },
    [onRemoveImagePath],
  );

  const handleClearImagePaths = useCallback(() => {
    setPreviewImagePaths([]);
    onClearImagePaths();
  }, [onClearImagePaths]);

  const handleAttachClipboardImage = useCallback(async () => {
    const addedImagePaths = await onAttachClipboardImage();
    setPreviewImagePaths((current) => appendUniqueImagePaths(current, addedImagePaths));
  }, [onAttachClipboardImage]);

  const handleAttachSelectedFinderImages = useCallback(async () => {
    const addedImagePaths = await onAttachSelectedFinderImages();
    setPreviewImagePaths((current) => appendUniqueImagePaths(current, addedImagePaths));
  }, [onAttachSelectedFinderImages]);

  const handleAttachLatestScreenshotImage = useCallback(async () => {
    const addedImagePaths = await onAttachLatestScreenshotImage();
    setPreviewImagePaths((current) => appendUniqueImagePaths(current, addedImagePaths));
  }, [onAttachLatestScreenshotImage]);

  return (
    <Grid
      navigationTitle="Images"
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Search images"
      actions={
        <ActionPanel>
          <Action
            title="Back to Form"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={pop}
          />
          <Action
            title="Attach Clipboard Image"
            icon={Icon.Image}
            shortcut={ATTACH_CLIPBOARD_IMAGE_SHORTCUT}
            onAction={handleAttachClipboardImage}
          />
          <Action
            title="Attach Latest Screenshot"
            icon={Icon.Image}
            shortcut={ATTACH_LATEST_SCREENSHOT_IMAGE_SHORTCUT}
            onAction={handleAttachLatestScreenshotImage}
          />
          <Action
            title="Attach Selected Finder Images"
            icon={Icon.Finder}
            shortcut={ATTACH_SELECTED_FINDER_IMAGES_SHORTCUT}
            onAction={handleAttachSelectedFinderImages}
          />
        </ActionPanel>
      }
    >
      {previewImagePaths.length === 0 ? (
        <Grid.EmptyView
          title="No images attached"
          icon={Icon.Image}
          actions={
            <ActionPanel>
              <Action
                title="Back to Form"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={pop}
              />
              <Action
                title="Attach Clipboard Image"
                icon={Icon.Image}
                shortcut={ATTACH_CLIPBOARD_IMAGE_SHORTCUT}
                onAction={handleAttachClipboardImage}
              />
              <Action
                title="Attach Latest Screenshot"
                icon={Icon.Image}
                shortcut={ATTACH_LATEST_SCREENSHOT_IMAGE_SHORTCUT}
                onAction={handleAttachLatestScreenshotImage}
              />
              <Action
                title="Attach Selected Finder Images"
                icon={Icon.Finder}
                shortcut={ATTACH_SELECTED_FINDER_IMAGES_SHORTCUT}
                onAction={handleAttachSelectedFinderImages}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {previewImagePaths.map((path) => (
        <Grid.Item
          key={path}
          title={basename(path)}
          subtitle={path}
          content={{ source: path, fallback: Icon.Image }}
          actions={
            <ActionPanel>
              <Action
                title="Back to Form"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={pop}
              />
              <Action
                title="Remove Image"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => handleRemoveImagePath(path)}
              />
              <Action title="Clear Images" icon={Icon.Trash} onAction={handleClearImagePaths} />
              <Action
                title="Attach Clipboard Image"
                icon={Icon.Image}
                shortcut={ATTACH_CLIPBOARD_IMAGE_SHORTCUT}
                onAction={handleAttachClipboardImage}
              />
              <Action
                title="Attach Latest Screenshot"
                icon={Icon.Image}
                shortcut={ATTACH_LATEST_SCREENSHOT_IMAGE_SHORTCUT}
                onAction={handleAttachLatestScreenshotImage}
              />
              <Action
                title="Attach Selected Finder Images"
                icon={Icon.Finder}
                shortcut={ATTACH_SELECTED_FINDER_IMAGES_SHORTCUT}
                onAction={handleAttachSelectedFinderImages}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

type CreateWorktreeFormValues = {
  initialPrompt: string;
  imagePaths?: string[];
  model: string;
  serviceTier: string;
  reasoningEffort: string;
  permissions: string;
  repoRoot: string;
  baseBranch: string;
  branch: string;
  openApp: string;
};

type RepoOption = {
  value: string;
  title: string;
  mapValue: string;
};

/**
 * リポジトリ選択肢を生成してソートする
 */
function buildRepoOptions(mappings: RepositoryMapping[]): RepoOption[] {
  return mappings
    .map((entry) => {
      const repoName = basename(entry.repoRoot);
      const mapValue = entry.mapValue || repoName;
      const title = mapValue !== repoName ? `${repoName} (${mapValue})` : repoName;
      return {
        value: entry.repoRoot,
        title,
        mapValue,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * フォームの repository 初期値を props から解決する
 */
function resolveInitialRepoDropdownValue(args: {
  initialRepoRoot: string | null;
  options: RepoOption[];
  mappings: RepositoryMapping[];
}): string {
  const optionValues = args.options.map((option) => option.value);
  const initialValue = resolveDropdownValue({
    selectedValue: args.initialRepoRoot ?? "",
    optionValues,
  });
  if (initialValue) {
    return initialValue;
  }

  const repoName = resolveRepoNameFromPath(args.initialRepoRoot);
  if (!repoName) {
    return "";
  }
  const mapping = args.mappings.find((entry) => {
    if (entry.mapValue?.trim() === repoName) {
      return true;
    }
    return resolvePathBasename(entry.repoRoot) === repoName;
  });
  return resolveDropdownValue({
    selectedValue: mapping?.repoRoot ?? "",
    optionValues,
  });
}

/**
 * worktree パスから repository 名を推定する
 */
function resolveRepoNameFromPath(path?: string | null): string | null {
  const basename = resolvePathBasename(path ?? "");
  if (!basename) {
    return null;
  }
  return basename;
}

/**
 * パス末尾の名前を返す
 */
function resolvePathBasename(path: string): string {
  const normalized = path.trim().replace(/\/+$/, "");
  if (!normalized) {
    return "";
  }
  const segments = normalized.split("/");
  return segments.at(-1) ?? normalized;
}

/**
 * Dropdown に設定する値を候補と突き合わせて正規化する
 */
export function resolveDropdownValue(args: { selectedValue: string; optionValues: string[] }): string {
  const selectedValue = args.selectedValue.trim();
  if (args.optionValues.includes(selectedValue)) {
    return selectedValue;
  }
  return "";
}

/**
 * 参照名を base branch dropdown の値へ正規化する
 */
export function normalizeBaseRefDropdownValue(ref?: string | null): string | null {
  const trimmed = ref?.trim();
  if (!trimmed) {
    return null;
  }
  const headsPrefix = "refs/heads/";
  if (trimmed.startsWith(headsPrefix)) {
    const branch = trimmed.slice(headsPrefix.length).trim();
    return branch || null;
  }
  const remotesPrefix = "refs/remotes/";
  if (trimmed.startsWith(remotesPrefix)) {
    const remoteRef = trimmed.slice(remotesPrefix.length).trim();
    return remoteRef || null;
  }
  return trimmed;
}

/**
 * 参照名からローカルブランチ名を抽出する
 */
export function extractLocalBranchNameFromRef(ref?: string | null): string | null {
  const normalized = normalizeBaseRefDropdownValue(ref);
  if (!normalized) {
    return null;
  }
  const splitIndex = normalized.indexOf("/");
  if (splitIndex === -1) {
    return normalized;
  }
  const branch = normalized.slice(splitIndex + 1).trim();
  return branch || null;
}

/**
 * default base ref から初期選択する base branch 値を返す
 */
export function resolveDefaultBaseBranchValue(args: {
  defaultBaseRef?: string | null;
  optionValues: string[];
}): string {
  const localBranch = extractLocalBranchNameFromRef(args.defaultBaseRef);
  if (localBranch && args.optionValues.includes(localBranch)) {
    return localBranch;
  }
  const normalizedRef = normalizeBaseRefDropdownValue(args.defaultBaseRef);
  if (normalizedRef && args.optionValues.includes(normalizedRef)) {
    return normalizedRef;
  }
  return "";
}

/**
 * default base ref を含めた base branch 候補を作る
 */
export function buildBaseBranchOptions(args: { branches: string[]; defaultBaseRef?: string | null }): BranchOption[] {
  const options = buildBranchOptions(args.branches);
  const optionValues = options.map((option) => option.value);
  const localBranch = extractLocalBranchNameFromRef(args.defaultBaseRef);
  const normalizedRef = normalizeBaseRefDropdownValue(args.defaultBaseRef);
  const defaultValue =
    localBranch && optionValues.includes(localBranch)
      ? localBranch
      : normalizedRef && !optionValues.includes(normalizedRef)
        ? normalizedRef
        : "";
  if (!defaultValue) {
    return options;
  }
  if (optionValues.includes(defaultValue)) {
    return options;
  }
  return [{ value: defaultValue, title: defaultValue }, ...options];
}

/**
 * 画像プレビュー入力と保存済みドラフトから送信用の画像パスを返す
 */
export function resolveCreateWorktreeFormImagePaths(args: { pickerValue?: string[]; draftText: string }): string[] {
  if (Array.isArray(args.pickerValue)) {
    return normalizeAutoStartImagePaths(args.pickerValue);
  }
  return normalizeAutoStartImagePaths(parseAutoStartImagePathsText(args.draftText));
}

/**
 * worktree の準備を待って固定アプリで開く
 */
type OpenWorktreeWhenReadyDependencies = {
  delay: (ms: number) => Promise<void>;
  openPathInPreferredApp: (path: string, openApp: WorktreeOpenApp) => Promise<void>;
  closeMainWindow: () => Promise<void>;
};

type CreateWorktreeFormDraftStorageDependencies = {
  removeItem: (key: string) => Promise<void>;
};

/**
 * worktree を選択アプリで開いてから Raycast のメインウィンドウを閉じる
 */
export async function openWorktreeWhenReady(
  path: string,
  openApp: WorktreeOpenApp,
  dependencies: OpenWorktreeWhenReadyDependencies = {
    delay,
    openPathInPreferredApp,
    closeMainWindow,
  },
): Promise<void> {
  try {
    await dependencies.delay(700);
    await dependencies.openPathInPreferredApp(path, openApp);
    await dependencies.closeMainWindow();
  } catch (error) {
    const openMessage = formatExecErrorMessage(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open worktree",
      message: openMessage,
    });
  }
}

/**
 * Create Worktree フォームの保持ドラフトを削除する
 */
export async function resetCreateWorktreeFormDraftStorage(
  dependencies: CreateWorktreeFormDraftStorageDependencies = {
    removeItem: LocalStorage.removeItem.bind(LocalStorage),
  },
): Promise<void> {
  await Promise.all([
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.autoStart),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.initialPrompt),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.imagePathsText),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.model),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.serviceTier),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.reasoningEffort),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.permissions),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.approvalPolicy),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.sandboxMode),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.approvalsReviewer),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.webSearch),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.branch),
    dependencies.removeItem(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.openApp),
  ]);
}

/**
 * プレビューから戻る時に focus 復元するフォーム item ID を返す
 */
export function resolveCreateWorktreeFormFocusRestoreItemId(args: {
  itemId: CreateWorktreeFormItemId;
  autoStart: boolean;
  hasBaseBranchError: boolean;
}): CreateWorktreeFocusableItemId {
  const visibleItemIds = buildCreateWorktreeFormItemOrder({
    autoStart: args.autoStart,
    hasBaseBranchError: args.hasBaseBranchError,
  });
  if (visibleItemIds.includes(args.itemId) && isCreateWorktreeFocusableItemId(args.itemId)) {
    return args.itemId;
  }
  return args.autoStart ? CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt : CREATE_WORKTREE_FORM_ITEM_IDS.branch;
}

/**
 * フォーム値から Codex 初回セッションのメタ情報を組み立てる
 */
function buildCodexInitialSessionMetadata(
  values: CreateWorktreeFormValues,
  customPermissionMetadata: CodexPermissionMetadata,
): CodexInitialSessionMetadata {
  const permissionMetadata = resolveCodexPermissionMetadata({
    permissionMode: resolvePermissionsMode(values.permissions),
    customMetadata: customPermissionMetadata,
  });
  return {
    model: resolveCodexModel(values.model),
    serviceTier: resolveServiceTier(values.serviceTier),
    reasoningEffort: resolveReasoningEffort(values.reasoningEffort),
    ...permissionMetadata,
  };
}

/**
 * model のフォーム値を正規化する
 */
function resolveCodexModel(value: string): string {
  const trimmed = value.trim();
  return CODEX_MODEL_OPTIONS.includes(trimmed) ? trimmed : DEFAULT_CODEX_INITIAL_SESSION_METADATA.model;
}

/**
 * service tier のフォーム値を正規化する
 */
function resolveServiceTier(value: string): CodexServiceTier {
  return value === "fast" ? "fast" : "default";
}

/**
 * reasoning effort のフォーム値を正規化する
 */
function resolveReasoningEffort(value: string): CodexReasoningEffort {
  if (value === "low" || value === "high" || value === "xhigh") {
    return value;
  }
  return "medium";
}

/**
 * permissions のフォーム値を正規化する
 */
function resolvePermissionsMode(value: string): CodexPermissionMode {
  if (value === "auto_review" || value === "full_access" || value === "custom") {
    return value;
  }
  return "default";
}

/**
 * 作成フォームの起動アプリ値を正規化する
 */
function resolveCreateFormOpenApp(value: string): WorktreeOpenApp {
  return value === "codex-app" ? "codex-app" : "zed";
}

/**
 * 指定ミリ秒待機する
 */
async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 環境変数からホームディレクトリを解決する
 */
function resolveHomeDir(): string | null {
  return process.env.HOME?.trim() ?? process.env.USERPROFILE?.trim() ?? null;
}

/**
 * worktree 作成ユースケースの実行コンテキストを構築する
 */
function buildWorktreeCreateContext(): WorktreeCreateContext {
  return {
    env: process.env,
    homeDir: resolveHomeDir(),
    assetsPath: environment.assetsPath,
    packageDir: __dirname,
    packageName: "worktree-deck",
  };
}

/**
 * Create Worktree フォームの表示順を返す
 */
export function buildCreateWorktreeFormItemOrder(args: {
  autoStart: boolean;
  hasBaseBranchError: boolean;
}): CreateWorktreeFormItemId[] {
  if (args.autoStart) {
    const items: CreateWorktreeFormItemId[] = [
      CREATE_WORKTREE_FORM_ITEM_IDS.initialPrompt,
      CREATE_WORKTREE_FORM_ITEM_IDS.imagePaths,
    ];
    items.push(CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot, CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch);
    if (args.hasBaseBranchError) {
      items.push(CREATE_WORKTREE_FORM_ITEM_IDS.baseBranchError);
    }
    items.push(
      CREATE_WORKTREE_FORM_ITEM_IDS.openApp,
      CREATE_WORKTREE_FORM_ITEM_IDS.spacing,
      CREATE_WORKTREE_FORM_ITEM_IDS.reasoningEffort,
      CREATE_WORKTREE_FORM_ITEM_IDS.model,
      CREATE_WORKTREE_FORM_ITEM_IDS.serviceTier,
      CREATE_WORKTREE_FORM_ITEM_IDS.permissions,
    );
    return items;
  }

  const items: CreateWorktreeFormItemId[] = [CREATE_WORKTREE_FORM_ITEM_IDS.branch];
  items.push(
    CREATE_WORKTREE_FORM_ITEM_IDS.spacing,
    CREATE_WORKTREE_FORM_ITEM_IDS.repoRoot,
    CREATE_WORKTREE_FORM_ITEM_IDS.baseBranch,
  );
  if (args.hasBaseBranchError) {
    items.push(CREATE_WORKTREE_FORM_ITEM_IDS.baseBranchError);
  }
  items.push(CREATE_WORKTREE_FORM_ITEM_IDS.openApp);
  return items;
}

/**
 * focus 復元できるフォーム item ID かを判定する
 */
function isCreateWorktreeFocusableItemId(itemId: CreateWorktreeFormItemId): itemId is CreateWorktreeFocusableItemId {
  return CREATE_WORKTREE_FOCUSABLE_ITEM_IDS.includes(itemId as CreateWorktreeFocusableItemId);
}
