import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { showFailureToast, usePromise } from "@raycast/utils";
import { AuditStore } from "./audit-store";
import type { AuditProject } from "./audit-projects";
import {
  aboutWcagMarkdown,
  accessibilityPrinciplesUrl,
  conformanceUrl,
  howToUseMarkdown,
  wcag2ictUrl,
  wcagOverviewUrl,
  wcagStandardUrl,
} from "./about";
import { criteria } from "./data";
import {
  aboutMeMarkdown,
  authorAuditUrl,
  authorBlogUrl,
  supportUrl,
} from "./author";
import { auditStats, statusLabel } from "./audit";
import type { AuditResult, AuditStatus } from "./audit";
import {
  AuditSummaryItem,
  recordedResultMarkdown,
  ResultActions,
  statusAppearance,
} from "./audit-ui";
import type { SaveAuditResult } from "./audit-ui";
import {
  appliesToVersion,
  criterionMarkdown,
  quickReferenceUrl,
  standardUrl,
  testCaseMarkdown,
  understandingUrl,
} from "./guide";
import {
  criteriaForScope,
  isReviewScope,
  REVIEW_SCOPE_STORAGE_KEY,
  reviewChecklistMarkdown,
  reviewLevelCounts,
  reviewScopeLabel,
  reviewScopeMarkdown,
} from "./review-scope";
import type { ReviewScope } from "./review-scope";
import type { Criterion, Principle, WcagVersion } from "./types";

const principles: Principle[] = [
  "Perceivable",
  "Operable",
  "Understandable",
  "Robust",
];

function versionTitle(version: WcagVersion): string {
  return version === "2.2"
    ? "WCAG 2.2 (Current)"
    : "WCAG 2.1 (Legacy projects)";
}

type ScopeControls = {
  scope: ReviewScope;
  overridden: boolean;
  onChooseScope: (scope: ReviewScope) => void;
  onResetScope: () => void;
};

const scopeOptions: ReviewScope[] = ["AA", "A", "AAA"];

function ReviewScopeMenu({ controls }: { controls: ScopeControls }) {
  return (
    <ActionPanel.Submenu title="Change Review Scope" icon={Icon.List}>
      {scopeOptions.map((option) => (
        <Action
          key={option}
          title={`${reviewScopeLabel(option)}${option === "AA" ? " (Recommended)" : ""}${option === controls.scope ? " · Current" : ""}`}
          icon={option === controls.scope ? Icon.CheckCircle : Icon.List}
          onAction={() => controls.onChooseScope(option)}
        />
      ))}
      <Action
        title="Use Default from Preferences"
        icon={Icon.Switch}
        onAction={controls.onResetScope}
      />
      <Action
        title="Open Extension Settings"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Submenu>
  );
}

function ReviewScopeItem({
  version,
  controls,
}: {
  version: WcagVersion;
  controls: ScopeControls;
}) {
  const { push } = useNavigation();
  const counts = reviewLevelCounts(criteria, version);
  const markdown = reviewScopeMarkdown(
    criteria,
    version,
    controls.scope,
    controls.overridden,
  );
  const checklist = reviewChecklistMarkdown(criteria, version, controls.scope);
  const total = criteriaForScope(criteria, version, controls.scope).length;
  const includedLevels =
    controls.scope === "A"
      ? `${counts.A} A · AA and AAA excluded`
      : controls.scope === "AA"
        ? `${counts.A} A + ${counts.AA} AA · AAA excluded`
        : `${counts.A} A + ${counts.AA} AA + ${counts.AAA} AAA`;

  return (
    <List.Item
      id="review-scope"
      title={`Review Scope: ${reviewScopeLabel(controls.scope)}`}
      subtitle={`${total} selected · ${includedLevels}`}
      icon={Icon.CheckCircle}
      keywords={[
        "testing scope",
        "review settings",
        "A + AA",
        "AAA",
        "legal",
        "conformance",
        "compliance",
        "checklist",
        "audit",
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action
            title="Open Review Scope Guide"
            icon={Icon.Book}
            onAction={() =>
              push(
                <Detail
                  navigationTitle="WCAG Review Scope"
                  markdown={markdown}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Review Checklist"
                        content={checklist}
                      />
                      <ReviewScopeMenu controls={controls} />
                      <Action
                        title="Open Extension Settings"
                        icon={Icon.Gear}
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel>
                  }
                />,
              )
            }
          />
          <Action.CopyToClipboard
            title="Copy Review Checklist"
            content={checklist}
          />
          <ReviewScopeMenu controls={controls} />
        </ActionPanel>
      }
    />
  );
}

function FullCriterionGuide({
  criterion,
  version,
  scopeControls,
  store,
}: {
  criterion: Criterion;
  version: WcagVersion;
  scopeControls: ScopeControls;
  store: AuditStore;
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const ready = snapshot.ready && !snapshot.busy;
  const record = snapshot.audits[version][criterion.number];
  const markdown =
    (ready
      ? recordedResultMarkdown(record)
      : "> Results are unavailable until the saved audit loads successfully. Reopen the command if loading failed.\n\n") +
    criterionMarkdown(criterion, version);
  const testCase = testCaseMarkdown(criterion, version);
  const save: SaveAuditResult = async (item, status, notes) => {
    try {
      await store.save(
        snapshot.activeProject.id,
        version,
        item.number,
        status,
        notes,
      );
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Could not save result" });
      return false;
    }
  };
  return (
    <Detail
      navigationTitle={`${criterion.number} ${criterion.title}`}
      isLoading={snapshot.busy}
      markdown={markdown}
      actions={
        <ActionPanel>
          {ready && (
            <ResultActions
              criterion={criterion}
              record={record}
              onSave={save}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Manual Test Case"
            content={testCase}
          />
          <Action.CopyToClipboard
            title="Copy Practical Guide"
            content={markdown}
          />
          <ReviewScopeMenu controls={scopeControls} />
          <ActionPanel.Section title="Official W3C Resources">
            <Action.OpenInBrowser
              title="W3C Understanding Guide"
              icon={Icon.Book}
              url={understandingUrl(criterion, version)}
            />
            <Action.OpenInBrowser
              title="Normative WCAG Criterion"
              icon={Icon.Link}
              url={standardUrl(criterion, version)}
            />
            <Action.OpenInBrowser
              title="W3C Quick Reference"
              icon={Icon.List}
              url={quickReferenceUrl(criterion, version)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CriterionItem({
  criterion,
  version,
  onSwitchVersion,
  scopeControls,
  record,
  onSave,
  ready,
  store,
}: {
  criterion: Criterion;
  version: WcagVersion;
  ready: boolean;
  store: AuditStore;
  onSwitchVersion: () => void;
  scopeControls: ScopeControls;
  record?: AuditResult;
  onSave: SaveAuditResult;
}) {
  const detail =
    recordedResultMarkdown(record) + criterionMarkdown(criterion, version);
  const testCase = testCaseMarkdown(criterion, version);
  const preview =
    recordedResultMarkdown(record) +
    criterionMarkdown(criterion, version, "preview");
  const resultStatus: AuditStatus = record?.status ?? "not-tested";
  const appearance = statusAppearance(resultStatus);
  const { push } = useNavigation();

  return (
    <List.Item
      id={criterion.number}
      title={`${criterion.number}  ${criterion.title}`}
      icon={{ source: appearance.icon, tintColor: appearance.color }}
      subtitle={`Level ${criterion.level} · ${ready ? statusLabel(resultStatus) : "Results unavailable"}`}
      keywords={[
        criterion.number,
        criterion.title,
        criterion.guideline,
        criterion.principle,
        criterion.plain,
        criterion.technical,
        ...criterion.keywords,
      ]}
      detail={
        <List.Item.Detail
          markdown={
            ready
              ? preview
              : "# Results unavailable\n\nWait for audit loading to finish. Reopen the command if loading failed.\n\n" +
                criterionMarkdown(criterion, version, "preview")
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Full Guide"
            icon={Icon.ArrowsExpand}
            onAction={() =>
              push(
                <FullCriterionGuide
                  criterion={criterion}
                  version={version}
                  store={store}
                  scopeControls={scopeControls}
                />,
              )
            }
          />
          {ready && (
            <ResultActions
              criterion={criterion}
              record={record}
              onSave={onSave}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Manual Test Case"
            content={testCase}
          />
          <Action.CopyToClipboard
            title="Copy Practical Guide"
            content={detail}
          />
          <Action.CopyToClipboard
            title="Copy Criterion Reference"
            content={`${criterion.number} ${criterion.title} (WCAG ${version}, Level ${criterion.level})`}
          />
          <ReviewScopeMenu controls={scopeControls} />
          <ActionPanel.Section title="Official W3C Resources">
            <Action.OpenInBrowser
              title="W3C Understanding Guide"
              icon={Icon.Book}
              url={understandingUrl(criterion, version)}
            />
            <Action.OpenInBrowser
              title="Normative WCAG Criterion"
              icon={Icon.Link}
              url={standardUrl(criterion, version)}
            />
            <Action.OpenInBrowser
              title="W3C Quick Reference"
              icon={Icon.List}
              url={quickReferenceUrl(criterion, version)}
            />
          </ActionPanel.Section>
          <Action
            title={`Switch to WCAG ${version === "2.2" ? "2.1" : "2.2"}`}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={onSwitchVersion}
          />
        </ActionPanel>
      }
    />
  );
}

function AboutWcagItem({
  version,
  scopeControls,
}: {
  version: WcagVersion;
  scopeControls: ScopeControls;
}) {
  const detail = aboutWcagMarkdown(version);
  const { push } = useNavigation();

  return (
    <List.Item
      id="about-wcag"
      title="About WCAG"
      icon={Icon.Info}
      keywords={[
        "introduction",
        "overview",
        "POUR",
        "Perceivable",
        "Operable",
        "Understandable",
        "Robust",
        "Level A",
        "Level AA",
        "Level AAA",
        "conformance",
      ]}
      detail={<List.Item.Detail markdown={detail} />}
      actions={
        <ActionPanel>
          <Action
            title="Open WCAG Guide in Full View"
            icon={Icon.Book}
            onAction={() =>
              push(
                <Detail
                  navigationTitle="About WCAG"
                  markdown={detail}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy WCAG Orientation"
                        content={detail}
                      />
                      <ReviewScopeMenu controls={scopeControls} />
                      <ActionPanel.Section title="Official W3C Resources">
                        <Action.OpenInBrowser
                          title="W3C WCAG Overview"
                          icon={Icon.Globe}
                          url={wcagOverviewUrl}
                        />
                        <Action.OpenInBrowser
                          title={`WCAG ${version} Standard`}
                          icon={Icon.Link}
                          url={wcagStandardUrl(version)}
                        />
                        <Action.OpenInBrowser
                          title="W3C Conformance Guide"
                          icon={Icon.CheckCircle}
                          url={conformanceUrl(version)}
                        />
                        <Action.OpenInBrowser
                          title="WCAG2ICT for Native Apps"
                          icon={Icon.Book}
                          url={wcag2ictUrl}
                        />
                        <Action.OpenInBrowser
                          title="W3C Accessibility Principles"
                          icon={Icon.Book}
                          url={accessibilityPrinciplesUrl}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />,
              )
            }
          />
          <Action.CopyToClipboard
            title="Copy WCAG Orientation"
            content={detail}
          />
          <ReviewScopeMenu controls={scopeControls} />
          <ActionPanel.Section title="Official W3C Resources">
            <Action.OpenInBrowser
              title="W3C WCAG Overview"
              icon={Icon.Globe}
              url={wcagOverviewUrl}
            />
            <Action.OpenInBrowser
              title={`WCAG ${version} Standard`}
              icon={Icon.Link}
              url={wcagStandardUrl(version)}
            />
            <Action.OpenInBrowser
              title="W3C Conformance Guide"
              icon={Icon.CheckCircle}
              url={conformanceUrl(version)}
            />
            <Action.OpenInBrowser
              title="WCAG2ICT for Native Apps"
              icon={Icon.Book}
              url={wcag2ictUrl}
            />
            <Action.OpenInBrowser
              title="W3C Accessibility Principles"
              icon={Icon.Book}
              url={accessibilityPrinciplesUrl}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HowToUseItem({
  version,
  scopeControls,
}: {
  version: WcagVersion;
  scopeControls: ScopeControls;
}) {
  const detail = howToUseMarkdown(version);
  const { push } = useNavigation();

  return (
    <List.Item
      id="how-to-use"
      title="How to Use This Guide"
      icon={Icon.QuestionMark}
      keywords={[
        "help",
        "instructions",
        "workflow",
        "manual testing",
        "automated testing",
        "audit",
        "evidence",
        "pass",
        "fail",
        "not applicable",
      ]}
      detail={<List.Item.Detail markdown={detail} />}
      actions={
        <ActionPanel>
          <Action
            title="Open How to Use This Guide"
            icon={Icon.QuestionMark}
            onAction={() =>
              push(
                <Detail
                  navigationTitle="How to Use This Guide"
                  markdown={detail}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Usage Guide"
                        content={detail}
                      />
                      <ReviewScopeMenu controls={scopeControls} />
                      <Action.OpenInBrowser
                        title={`WCAG ${version} Standard`}
                        icon={Icon.Link}
                        url={wcagStandardUrl(version)}
                      />
                    </ActionPanel>
                  }
                />,
              )
            }
          />
          <Action.CopyToClipboard title="Copy Usage Guide" content={detail} />
          <ReviewScopeMenu controls={scopeControls} />
          <Action.OpenInBrowser
            title={`WCAG ${version} Standard`}
            icon={Icon.Link}
            url={wcagStandardUrl(version)}
          />
        </ActionPanel>
      }
    />
  );
}

function AboutMeItem() {
  const markdown = aboutMeMarkdown();
  const { push } = useNavigation();
  const actions = (
    <ActionPanel>
      <Action
        title="Visit A11y Audit"
        icon={Icon.Globe}
        onAction={() => void open(authorAuditUrl)}
      />
      <Action
        title="Visit Cats & Tests Blog"
        icon={Icon.Globe}
        onAction={() => void open(authorBlogUrl)}
      />
      <Action
        title="Buy Me a Coffee (Optional)"
        icon={Icon.Heart}
        onAction={() => void open(supportUrl)}
      />
      <Action.CopyToClipboard
        title="Copy Author Information"
        content={markdown}
        icon={Icon.Clipboard}
      />
    </ActionPanel>
  );
  return (
    <List.Item
      id="about-me"
      title="About Me"
      subtitle="Meet the author · A11y Audit · Cats & Tests · Support"
      icon={Icon.Person}
      keywords={[
        "author",
        "Łukasz Krause",
        "blog",
        "Cats and Tests",
        "a11y",
        "audit",
        "a11y-audit.eu",
        "coffee",
        "support",
        "about me",
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action
            title="Open About Me"
            icon={Icon.Person}
            onAction={() =>
              push(
                <Detail
                  navigationTitle="About Me"
                  markdown={markdown}
                  actions={actions}
                />,
              )
            }
          />
          <Action
            title="Visit A11y Audit"
            icon={Icon.Globe}
            onAction={() => void open(authorAuditUrl)}
          />
          <Action
            title="Visit Cats & Tests Blog"
            icon={Icon.Globe}
            onAction={() => void open(authorBlogUrl)}
          />
          <Action
            title="Buy Me a Coffee (Optional)"
            icon={Icon.Heart}
            onAction={() => void open(supportUrl)}
          />
        </ActionPanel>
      }
    />
  );
}

function NewAuditForm({
  onCreate,
}: {
  onCreate: (name: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Form
      navigationTitle="Create Audit"
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Separate Audit"
            icon={Icon.Plus}
            onSubmit={async () => {
              if (saving) return;
              if (!name.trim()) {
                await showToast(Toast.Style.Failure, "Enter an audit name");
                return;
              }
              setSaving(true);
              const ok = await onCreate(name.trim());
              setSaving(false);
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="A new audit has independent WCAG 2.1 and 2.2 results. Your existing audits remain unchanged." />
      <Form.TextField
        id="name"
        title="Audit name"
        placeholder="e.g. Mobile booking flow · November 2026"
        value={name}
        onChange={setName}
      />
    </Form>
  );
}

/** Audit management belongs in the Audit Summary actions, not a separate list screen. */
function AuditManagementActions({
  projects,
  activeProject,
  onSwitch,
  onCreate,
  onDelete,
}: {
  projects: AuditProject[];
  activeProject: AuditProject;
  onSwitch: (project: AuditProject) => Promise<void>;
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (project: AuditProject) => Promise<void>;
}) {
  const { push } = useNavigation();
  return (
    <ActionPanel.Submenu title="Manage Audits" icon={Icon.Folder}>
      <Action
        title="Create New Audit…"
        icon={Icon.Plus}
        onAction={() => push(<NewAuditForm onCreate={onCreate} />)}
      />
      {projects.map((project) => (
        <Action
          key={project.id}
          title={`${project.id === activeProject.id ? "Current: " : "Switch to: "}${project.name}`}
          icon={
            project.id === activeProject.id ? Icon.CheckCircle : Icon.Folder
          }
          onAction={() => void onSwitch(project)}
        />
      ))}
      {activeProject.id !== "default" && (
        <Action
          title="Delete Selected Audit…"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => void onDelete(activeProject)}
        />
      )}
    </ActionPanel.Submenu>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [version, setVersion] = useState<WcagVersion>(
    preferences.defaultVersion,
  );
  const {
    data: savedScope,
    revalidate: refreshScope,
    isLoading: scopeLoading,
  } = usePromise(() => LocalStorage.getItem<string>(REVIEW_SCOPE_STORAGE_KEY));
  const scopeWrites = useRef<Promise<unknown>>(Promise.resolve());
  const persistScope = (next?: ReviewScope) => {
    const write = scopeWrites.current
      .catch(() => undefined)
      .then(async () => {
        if (next) await LocalStorage.setItem(REVIEW_SCOPE_STORAGE_KEY, next);
        else await LocalStorage.removeItem(REVIEW_SCOPE_STORAGE_KEY);
        await refreshScope();
      });
    scopeWrites.current = write;
    return write;
  };
  const scope = isReviewScope(savedScope)
    ? savedScope
    : preferences.defaultLevel;
  const overridden = isReviewScope(savedScope);
  const storeRef = useRef<AuditStore | null>(null);
  if (!storeRef.current) {
    const valid = (edition: WcagVersion) =>
      new Set(
        criteria
          .filter((item) => appliesToVersion(item, edition))
          .map((item) => item.number),
      );
    storeRef.current = new AuditStore(LocalStorage, {
      "2.1": valid("2.1"),
      "2.2": valid("2.2"),
    });
  }
  const store = storeRef.current;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { projects, activeProject, audits } = snapshot;
  const auditLoaded = snapshot.ready && !snapshot.busy;
  useEffect(() => {
    void store
      .initialize()
      .catch((error) =>
        showFailureToast(error, { title: "Could not load saved audits" }),
      );
  }, [store]);

  const loadProject = async (project: AuditProject) => {
    try {
      await store.switchProject(project.id);
    } catch (error) {
      await showFailureToast(error, { title: "Could not switch audit" });
    }
  };
  const createAudit = async (name: string): Promise<boolean> => {
    try {
      await store.create(name);
      return true;
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not create or select audit",
      });
      return false;
    }
  };
  const deleteAudit = async (project: AuditProject) => {
    if (
      !(await confirmAlert({
        title: `Delete ${project.name}?`,
        message:
          "This removes both WCAG versions and their notes. Export the results first if needed.",
        primaryAction: {
          title: "Delete Audit",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    try {
      await store.delete(project.id);
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not complete audit deletion",
      });
    }
  };
  // Capture the editor's project and edition, so old forms cannot write to a new audit.
  const saveAudit: SaveAuditResult = async (criterion, status, notes) => {
    try {
      await store.save(
        activeProject.id,
        version,
        criterion.number,
        status,
        notes,
      );
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Could not save result" });
      return false;
    }
  };
  const clearAudit = async (edition: WcagVersion): Promise<boolean> => {
    try {
      await store.clear(activeProject.id, edition);
      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Could not clear results" });
      return false;
    }
  };
  const chooseScope = async (next: ReviewScope) => {
    try {
      await persistScope(next);
    } catch (error) {
      await showFailureToast(error, { title: "Could not save review scope" });
    }
  };
  const resetScope = async () => {
    try {
      await persistScope();
    } catch (error) {
      await showFailureToast(error, { title: "Could not reset review scope" });
    }
  };

  const scopeControls: ScopeControls = {
    scope,
    overridden,
    onChooseScope: (next) => void chooseScope(next),
    onResetScope: () => void resetScope(),
  };

  const visibleCriteria = criteriaForScope(criteria, version, scope);

  const switchVersion = () =>
    setVersion((current) => (current === "2.2" ? "2.1" : "2.2"));

  const summaryProps = {
    criteria,
    version,
    scope,
    results: audits[version],
    onReset: clearAudit,
    projectName: activeProject.name,
    ready: auditLoaded,
    loading: snapshot.busy,
    auditManagement: (
      <AuditManagementActions
        projects={projects}
        activeProject={activeProject}
        onSwitch={loadProject}
        onCreate={createAudit}
        onDelete={deleteAudit}
      />
    ),
  };
  const summaryRef = useRef(summaryProps);
  summaryRef.current = summaryProps;

  return (
    <List
      isLoading={scopeLoading || snapshot.busy}
      isShowingDetail
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search by number, topic, problem, or technique…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose WCAG version"
          value={version}
          onChange={(value) => setVersion(value as WcagVersion)}
        >
          <List.Dropdown.Item
            title="WCAG 2.2 (Recommended)"
            value="2.2"
            icon={Icon.Stars}
          />
          <List.Dropdown.Item title="WCAG 2.1" value="2.1" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Your Audit"
        subtitle={`${activeProject.name} · WCAG ${version} · ${reviewScopeLabel(scope)} · ${auditStats(visibleCriteria, audits[version]).progress}% reviewed`}
      >
        <AuditSummaryItem
          {...summaryProps}
          live={{
            subscribe: store.subscribe,
            getSnapshot: store.getSnapshot,
            getProps: () => {
              const current = store.getSnapshot();
              return {
                ...summaryRef.current,
                results: current.audits[summaryRef.current.version],
                projectName: current.activeProject.name,
                ready: current.ready && !current.busy,
                loading: current.busy,
                onReset: async (edition) => {
                  try {
                    await store.clear(current.activeProject.id, edition);
                    return true;
                  } catch (error) {
                    await showFailureToast(error, {
                      title: "Could not clear results",
                    });
                    return false;
                  }
                },
                auditManagement: (
                  <AuditManagementActions
                    projects={current.projects}
                    activeProject={current.activeProject}
                    onSwitch={loadProject}
                    onCreate={createAudit}
                    onDelete={deleteAudit}
                  />
                ),
              };
            },
          }}
        />
        <ReviewScopeItem version={version} controls={scopeControls} />
      </List.Section>
      <List.Section title="Guide and Support">
        <AboutWcagItem version={version} scopeControls={scopeControls} />
        <HowToUseItem version={version} scopeControls={scopeControls} />
        <AboutMeItem />
      </List.Section>

      {principles.map((principle) => {
        const items = visibleCriteria.filter(
          (criterion) => criterion.principle === principle,
        );
        return (
          <List.Section
            key={principle}
            title={principle}
            subtitle={`${items.length} criteria · ${versionTitle(version)} · ${reviewScopeLabel(scope)}`}
          >
            {items.map((criterion) => (
              <CriterionItem
                key={`${version}-${criterion.number}`}
                criterion={criterion}
                version={version}
                onSwitchVersion={switchVersion}
                scopeControls={scopeControls}
                record={audits[version][criterion.number]}
                onSave={saveAudit}
                ready={auditLoaded}
                store={store}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
