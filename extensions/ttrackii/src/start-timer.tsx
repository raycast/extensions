import {
  Action,
  ActionPanel,
  Form,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { resources, startTimer, timer, updateTimer } from "./lib/api";
import {
  compatible,
  defaultRate,
  duration,
  elapsed,
  formatRate,
  isCurrency,
  parseRate,
  rateInput,
  timerSelection,
} from "./lib/domain";
import { message, refreshMenuBar } from "./lib/actions";
import { useWorkspaces } from "./lib/hooks";
import { useAuth, withAuth } from "./components/auth";
import {
  AccountSection,
  projectIcon,
  RefreshAction,
  tagIcon,
} from "./components/shared";
import type { Billing, Resources, Timer } from "./lib/types";

type RateMode = Billing["mode"];
export type StartTimerDraft = {
  workspaceId?: string;
  taskName?: string;
  projectId?: string | null;
  tagIds?: string[];
  billing?: Billing;
};

/**
 * `onStarted` is set when another command pushed this form; it then pops back
 * instead of closing Raycast. `draft` pre-fills it, e.g. from a recent entry.
 */
export function StartTimerForm({
  onStarted,
  draft,
  editing,
}: {
  onStarted?: () => void;
  draft?: StartTimerDraft;
  /** Edit this running entry in place instead of starting a new timer. */
  editing?: { entryId: string };
}) {
  const auth = useAuth();
  const { pop } = useNavigation();
  const ws = useWorkspaces();
  const [available, setAvailable] = useState<Resources>();
  const [active, setActive] = useState<Timer>();
  const [taskName, setTaskName] = useState(draft?.taskName ?? "");
  const [projectId, setProjectId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [rateMode, setRateMode] = useState<RateMode>(
    draft?.billing?.mode ?? "default",
  );
  const [customRate, setCustomRate] = useState("");
  const [customCurrency, setCustomCurrency] = useState("");
  const [errors, setErrors] = useState<{
    project?: string;
    rate?: string;
    currency?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(0);
  // The draft's project and tags apply once, to the draft's own workspace.
  const pendingDraft = useRef(draft);
  const workspace = ws.data?.workspaces.find((w) => w.id === ws.workspaceId);

  useEffect(() => {
    const wanted = pendingDraft.current?.workspaceId;
    if (wanted && ws.data?.workspaces.some((w) => w.id === wanted))
      ws.select(wanted);
  }, [ws.data]);

  useEffect(() => {
    if (!ws.workspaceId) return;
    let cancelled = false;
    setLoading(true);
    setAvailable(undefined);
    setErrors({});
    setLoadError("");
    void Promise.all([resources(ws.workspaceId, revision > 0), timer()])
      .then(([result, current]) => {
        if (cancelled) return;
        const pending = pendingDraft.current;
        const applies =
          pending &&
          (!pending.workspaceId || pending.workspaceId === ws.workspaceId);
        setProjectId(
          applies && result.projects.some((p) => p.id === pending.projectId)
            ? (pending.projectId ?? "")
            : "",
        );
        setTagIds(
          applies
            ? (pending.tagIds ?? []).filter((id) =>
                result.tags.some((t) => t.id === id),
              )
            : [],
        );
        if (applies && pending.billing?.mode === "custom") {
          const { billingRateMinor, billingCurrency } = pending.billing;
          setCustomCurrency(billingCurrency);
          setCustomRate(rateInput(billingRateMinor, billingCurrency));
        }
        if (applies) pendingDraft.current = undefined;
        setAvailable(result);
        setActive(current);
      })
      .catch((error) => {
        if (!cancelled && !auth.handle(error)) setLoadError(message(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ws.workspaceId, revision]);

  const project = available?.projects.find((p) => p.id === projectId);
  const chosenTags = tagIds
    .map((id) => available?.tags.find((t) => t.id === id))
    .filter((tag) => tag !== undefined);
  // Selected tags stay listed even if the project changes, so they can be removed.
  const pickableTags =
    available?.tags.filter(
      (tag) =>
        tagIds.includes(tag.id) ||
        compatible(
          project,
          tag,
          chosenTags.filter((t) => t.id !== tag.id),
        ),
    ) ?? [];
  const inferredProject =
    project ??
    available?.projects.find(
      (p) => p.id === chosenTags.find((t) => t.projectId)?.projectId,
    );
  const fallbackRate = defaultRate(inferredProject, chosenTags);
  const team = workspace?.kind === "team";
  const currencyHint =
    fallbackRate?.billingCurrency ??
    inferredProject?.billingCurrency ??
    ws.data?.defaultCurrency ??
    "USD";

  function billing(): Billing | undefined {
    if (rateMode !== "custom") return { mode: rateMode };
    const currency = (customCurrency || currencyHint).trim().toUpperCase();
    const next: typeof errors = {};
    if (!isCurrency(currency)) next.currency = "Use a 3-letter code, like EUR";
    const rate = isCurrency(currency)
      ? parseRate(customRate, currency)
      : undefined;
    if (rate === undefined)
      next.rate = "Enter an hourly amount, like 85 or 85.50";
    setErrors((current) => ({ ...current, ...next }));
    return rate === undefined || next.currency
      ? undefined
      : { mode: "custom", billingRateMinor: rate, billingCurrency: currency };
  }

  async function submit() {
    if (submitting.current || !workspace || !available || loading) return;
    let selected;
    try {
      selected = timerSelection(workspace, available, projectId, tagIds);
    } catch (error) {
      if (team && !inferredProject)
        setErrors((current) => ({
          ...current,
          project: "Required for team timers",
        }));
      else
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't start this timer",
          message: message(error),
        });
      return;
    }
    const chosenBilling = billing();
    if (!chosenBilling) return;
    submitting.current = true;
    setBusy(true);
    const task = taskName.trim();
    try {
      if (editing) {
        await updateTimer({
          entryId: editing.entryId,
          taskName: task,
          projectId: selected.projectId,
          tagIds: selected.tagIds,
          billing: chosenBilling,
        });
        await refreshMenuBar();
        if (onStarted) {
          await showToast({
            style: Toast.Style.Success,
            title: "Timer updated",
          });
          pop();
          onStarted();
        } else {
          // Opened directly (e.g. from the menu bar): nothing to pop back to.
          await showHUD("Timer updated");
          await popToRoot({ clearSearchBar: true });
        }
        return;
      }
      await startTimer({ ...selected, taskName: task, billing: chosenBilling });
      await refreshMenuBar();
      if (onStarted) {
        await showToast({
          style: Toast.Style.Success,
          title: `Started “${task || "Untitled"}”`,
        });
        pop();
        onStarted();
      } else {
        await showHUD(`Started “${task || "Untitled"}”`);
        await popToRoot({ clearSearchBar: true });
      }
    } catch (error) {
      if (auth.handle(error)) return;
      await showToast({
        style: Toast.Style.Failure,
        title: editing ? "Couldn't update timer" : "Couldn't start timer",
        message: message(error),
      });
      // The request may or may not have reached ttrackii; reload what is running now.
      setRevision((v) => v + 1);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const running = active?.running ? active : undefined;
  const error = ws.error || loadError;
  return (
    <Form
      isLoading={ws.loading || loading || busy}
      navigationTitle={editing ? "Edit Timer" : "Start Timer"}
      actions={
        <ActionPanel>
          {available && workspace?.writable && (
            <Action.SubmitForm
              title={
                editing
                  ? "Save Changes"
                  : running
                    ? "Switch Timer"
                    : "Start Timer"
              }
              icon={editing ? Icon.Checkmark : Icon.Play}
              onSubmit={submit}
            />
          )}
          <ActionPanel.Section>
            <RefreshAction
              onAction={() => {
                void ws.reload();
                setRevision((v) => v + 1);
              }}
            />
          </ActionPanel.Section>
          <AccountSection />
        </ActionPanel>
      }
    >
      {running?.entry && !editing && (
        <Form.Description
          title="Running"
          text={`“${running.entry.taskName || "Untitled"}” · ${duration(elapsed(running))}. Starting a new timer stops it.`}
        />
      )}
      {error && (
        <Form.Description
          title="Couldn't load"
          text={`${error} Press ⌘R to retry.`}
        />
      )}
      <Form.TextField
        id="taskName"
        title="Task"
        placeholder="What are you working on?"
        value={taskName}
        onChange={setTaskName}
        autoFocus
      />
      {/* A running entry can't move between workspaces. */}
      {(ws.data?.workspaces.length ?? 0) > 1 && !editing && (
        <Form.Dropdown
          id="workspace"
          title="Workspace"
          value={ws.workspaceId}
          onChange={(id) => {
            pendingDraft.current = undefined;
            ws.select(id);
          }}
          info={
            workspace && !workspace.writable
              ? "This workspace is read-only."
              : undefined
          }
        >
          {ws.data?.workspaces.map((w) => (
            <Form.Dropdown.Item
              key={w.id}
              value={w.id}
              icon={w.kind === "personal" ? Icon.Person : Icon.TwoPeople}
              title={`${w.kind === "personal" ? "Personal" : w.name}${w.writable ? "" : " (read-only)"}`}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="project"
        title="Project"
        value={projectId}
        error={errors.project}
        info={team ? "Team timers need a project." : undefined}
        onChange={(id) => {
          setProjectId(id);
          setErrors((current) => ({ ...current, project: undefined }));
          // Drop tags that no longer fit; a project tag would otherwise re-select its project.
          const next = available?.projects.find((p) => p.id === id);
          setTagIds((current) =>
            current.filter((tagId, index) => {
              const tag = available?.tags.find((t) => t.id === tagId);
              const before = current
                .slice(0, index)
                .map((other) => available?.tags.find((t) => t.id === other))
                .filter((t) => t !== undefined);
              return (
                tag && compatible(next, tag, before) && (id || !tag.projectId)
              );
            }),
          );
        }}
      >
        <Form.Dropdown.Item
          value=""
          title={team ? "Choose a project" : "No project"}
          icon={Icon.Circle}
        />
        {available?.projects.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id}
            title={p.name}
            icon={projectIcon(p.color)}
          />
        ))}
      </Form.Dropdown>
      {(available?.tags.length ?? 0) > 0 && (
        <Form.TagPicker
          id="tags"
          title="Tags"
          placeholder="Add tags"
          value={tagIds}
          onChange={(ids) => {
            setTagIds(ids);
            const tagged = ids
              .map((id) => available?.tags.find((t) => t.id === id))
              .find((t) => t?.projectId);
            if (!projectId && tagged?.projectId) {
              setProjectId(tagged.projectId);
              setErrors((current) => ({ ...current, project: undefined }));
            }
          }}
        >
          {pickableTags.map((t) => (
            <Form.TagPicker.Item
              key={t.id}
              value={t.id}
              title={t.name}
              icon={tagIcon(t.color)}
            />
          ))}
        </Form.TagPicker>
      )}
      <Form.Separator />
      <Form.Dropdown
        id="rate"
        title="Rate"
        value={rateMode}
        onChange={(mode) => {
          setRateMode(mode as RateMode);
          setErrors((current) => ({
            ...current,
            rate: undefined,
            currency: undefined,
          }));
        }}
      >
        <Form.Dropdown.Item
          value="default"
          icon={Icon.Coins}
          title={
            fallbackRate
              ? `Default · ${formatRate(fallbackRate.billingRateMinor, fallbackRate.billingCurrency)}`
              : "Default · no rate set"
          }
        />
        <Form.Dropdown.Item
          value="none"
          icon={Icon.MinusCircle}
          title="Non-billable"
        />
        <Form.Dropdown.Item
          value="custom"
          icon={Icon.Pencil}
          title="Custom rate"
        />
      </Form.Dropdown>
      {rateMode === "custom" && (
        <>
          <Form.TextField
            id="customRate"
            title="Hourly Rate"
            placeholder="85.00"
            value={customRate}
            error={errors.rate}
            onChange={(value) => {
              setCustomRate(value);
              setErrors((current) => ({ ...current, rate: undefined }));
            }}
          />
          <Form.TextField
            id="customCurrency"
            title="Currency"
            placeholder={currencyHint}
            value={customCurrency}
            error={errors.currency}
            onChange={(value) => {
              setCustomCurrency(value.toUpperCase());
              setErrors((current) => ({ ...current, currency: undefined }));
            }}
          />
        </>
      )}
    </Form>
  );
}

export default withAuth(StartTimerForm, <Form isLoading />);
