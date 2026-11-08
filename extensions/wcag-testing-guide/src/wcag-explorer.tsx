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
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import {
  AUDIT_ACTIVE_PROJECT_KEY,
  AUDIT_PROJECTS_KEY,
  DEFAULT_PROJECT,
  parseAuditProjects,
  projectStorageKey,
  safeActiveProjectId,
} from "./audit-projects";
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
import { parseAuditResults, auditStats, statusLabel } from "./audit";
import type { AuditResults, AuditResult, AuditStatus } from "./audit";
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

type Preferences = {
  defaultVersion: WcagVersion;
  defaultLevel: ReviewScope;
};

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
      accessories={
        controls.scope === "AA"
          ? [{ tag: "Recommended" }]
          : [{ text: "Custom scope" }]
      }
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
            shortcut={Keyboard.Shortcut.Common.Copy}
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
  initialRecord,
  onSave,
  scopeControls,
}: {
  criterion: Criterion;
  version: WcagVersion;
  initialRecord?: AuditResult;
  onSave: SaveAuditResult;
  scopeControls: ScopeControls;
}) {
  const [record, setRecord] = useState<AuditResult | undefined>(initialRecord);
  const markdown =
    recordedResultMarkdown(record) + criterionMarkdown(criterion, version);
  const testCase = testCaseMarkdown(criterion, version);
  const save: SaveAuditResult = async (item, status, notes) => {
    const ok = await onSave(item, status, notes);
    if (ok) setRecord({ status, notes, updatedAt: new Date().toISOString() });
    return ok;
  };
  return (
    <Detail
      navigationTitle={`${criterion.number} ${criterion.title}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ResultActions criterion={criterion} record={record} onSave={save} />
          <Action.CopyToClipboard
            title="Copy Manual Test Case"
            content={testCase}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Practical Guide"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
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
}: {
  criterion: Criterion;
  version: WcagVersion;
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
      accessories={[
        { tag: { value: statusLabel(resultStatus), color: appearance.color } },
        { text: `Level ${criterion.level}` },
      ]}
      keywords={[
        criterion.number,
        criterion.title,
        criterion.guideline,
        criterion.principle,
        criterion.plain,
        criterion.technical,
        ...criterion.keywords,
      ]}
      detail={<List.Item.Detail markdown={preview} />}
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
                  initialRecord={record}
                  onSave={onSave}
                  scopeControls={scopeControls}
                />,
              )
            }
          />
          <ResultActions
            criterion={criterion}
            record={record}
            onSave={onSave}
          />
          <Action.CopyToClipboard
            title="Copy Manual Test Case"
            content={testCase}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Practical Guide"
            content={detail}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
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
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
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
            shortcut={{ modifiers: ["cmd"], key: "c" }}
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
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
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
          <Action.CopyToClipboard
            title="Copy Usage Guide"
            content={detail}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
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
  const [scope, setScope] = useState<ReviewScope>(
    preferences.defaultLevel ?? "AA",
  );
  const [overridden, setOverridden] = useState(false);
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [projects, setProjects] = useState<AuditProject[]>([DEFAULT_PROJECT]);
  const [activeProject, setActiveProject] =
    useState<AuditProject>(DEFAULT_PROJECT);
  const activeProjectRef = useRef<AuditProject>(DEFAULT_PROJECT);
  const [audits, setAudits] = useState<Record<WcagVersion, AuditResults>>({
    "2.1": {},
    "2.2": {},
  });
  const auditsRef = useRef<Record<WcagVersion, AuditResults>>({
    "2.1": {},
    "2.2": {},
  });
  const pendingWritesRef = useRef<Promise<unknown>>(Promise.resolve());

  const validNumbers21 = useMemo(
    () =>
      new Set(
        criteria
          .filter((item) => appliesToVersion(item, "2.1"))
          .map((item) => item.number),
      ),
    [],
  );
  const validNumbers22 = useMemo(
    () =>
      new Set(
        criteria
          .filter((item) => appliesToVersion(item, "2.2"))
          .map((item) => item.number),
      ),
    [],
  );

  const loadProject = async (project: AuditProject): Promise<void> => {
    setAuditLoaded(false);
    try {
      await pendingWritesRef.current.catch(() => undefined);
      const [r21, r22] = await Promise.all(
        (["2.1", "2.2"] as WcagVersion[]).map((edition) =>
          LocalStorage.getItem<string>(projectStorageKey(project.id, edition)),
        ),
      );
      const loaded = {
        "2.1": parseAuditResults(r21, validNumbers21),
        "2.2": parseAuditResults(r22, validNumbers22),
      };
      await LocalStorage.setItem(AUDIT_ACTIVE_PROJECT_KEY, project.id);
      auditsRef.current = loaded;
      activeProjectRef.current = project;
      setAudits(loaded);
      setActiveProject(project);
    } catch {
      await showToast(
        Toast.Style.Failure,
        "Could not load selected audit",
        "The previous audit remains active.",
      );
    } finally {
      setAuditLoaded(true);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      LocalStorage.getItem<string>(AUDIT_PROJECTS_KEY),
      LocalStorage.getItem<string>(AUDIT_ACTIVE_PROJECT_KEY),
    ])
      .then(async ([storedProjects, storedId]) => {
        if (!active) return;
        const list = parseAuditProjects(storedProjects);
        const id = safeActiveProjectId(storedId, list);
        setProjects(list);
        await loadProject(list.find((p) => p.id === id) ?? DEFAULT_PROJECT);
      })
      .catch(() => {
        if (active) {
          setAuditLoaded(true);
          void showToast(Toast.Style.Failure, "Could not load saved audits");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const createAudit = async (name: string): Promise<boolean> => {
    if (projects.length >= 100 || name.length > 90 || !name.trim()) {
      await showToast(Toast.Style.Failure, "Enter a name of 1–90 characters");
      return false;
    }
    const project = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    const updated = [...projects, project];
    try {
      await LocalStorage.setItem(AUDIT_PROJECTS_KEY, JSON.stringify(updated));
      setProjects(updated);
      await loadProject(project);
      return activeProjectRef.current.id === project.id;
    } catch {
      await showToast(Toast.Style.Failure, "Could not create audit");
      return false;
    }
  };

  const deleteAudit = async (project: AuditProject): Promise<void> => {
    if (project.id === "default") return;
    const confirmed = await confirmAlert({
      title: `Delete ${project.name}?`,
      message:
        "This permanently removes both WCAG versions and their notes for this audit. Export the results first if needed.",
      primaryAction: {
        title: "Delete Audit",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await pendingWritesRef.current.catch(() => undefined);
      await Promise.all(
        (["2.1", "2.2"] as WcagVersion[]).map((v) =>
          LocalStorage.removeItem(projectStorageKey(project.id, v)),
        ),
      );
      const remaining = projects.filter((p) => p.id !== project.id);
      await LocalStorage.setItem(AUDIT_PROJECTS_KEY, JSON.stringify(remaining));
      setProjects(remaining);
      await loadProject(DEFAULT_PROJECT);
    } catch {
      await showToast(Toast.Style.Failure, "Could not delete selected audit");
    }
  };

  const saveAudit: SaveAuditResult = async (criterion, status, notes) => {
    const edition = version;
    const project = activeProjectRef.current;
    const updated: AuditResults = {
      ...auditsRef.current[edition],
      [criterion.number]: {
        status,
        notes,
        updatedAt: new Date().toISOString(),
      },
    };
    const next = { ...auditsRef.current, [edition]: updated };
    auditsRef.current = next;
    setAudits(next);
    const write = pendingWritesRef.current
      .catch(() => undefined)
      .then(() =>
        LocalStorage.setItem(
          projectStorageKey(project.id, edition),
          JSON.stringify(updated),
        ),
      );
    pendingWritesRef.current = write;
    try {
      await write;
      return true;
    } catch {
      await showToast(
        Toast.Style.Failure,
        "Could not save result",
        "The change is visible now, but may be lost when Raycast closes.",
      );
      return false;
    }
  };

  const clearAudit = async (edition: WcagVersion): Promise<boolean> => {
    const project = activeProjectRef.current;
    const next = { ...auditsRef.current, [edition]: {} };
    auditsRef.current = next;
    setAudits(next);
    const write = pendingWritesRef.current
      .catch(() => undefined)
      .then(() =>
        LocalStorage.removeItem(projectStorageKey(project.id, edition)),
      );
    pendingWritesRef.current = write;
    try {
      await write;
      await showToast(
        Toast.Style.Success,
        `WCAG ${edition} results cleared for ${project.name}`,
      );
      return true;
    } catch {
      await showToast(Toast.Style.Failure, "Could not remove saved results");
      return false;
    }
  };

  // Keep the active scope in sync when the native preferences change,
  // unless the user explicitly saved an override from the Actions menu.
  useEffect(() => {
    if (scopeLoaded && !overridden) {
      setScope(preferences.defaultLevel ?? "AA");
    }
  }, [preferences.defaultLevel, scopeLoaded, overridden]);

  useEffect(() => {
    let active = true;
    LocalStorage.getItem<string>(REVIEW_SCOPE_STORAGE_KEY)
      .then((saved) => {
        if (!active) return;
        if (isReviewScope(saved)) {
          setScope(saved);
          setOverridden(true);
        }
      })
      .catch(() => {
        if (active)
          void showToast(
            Toast.Style.Failure,
            "Could not read saved review scope",
          );
      })
      .finally(() => {
        if (active) setScopeLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const chooseScope = async (next: ReviewScope) => {
    try {
      await LocalStorage.setItem(REVIEW_SCOPE_STORAGE_KEY, next);
      setScope(next);
      setOverridden(true);
    } catch {
      await showToast(Toast.Style.Failure, "Could not save review scope");
    }
  };

  const resetScope = async () => {
    try {
      await LocalStorage.removeItem(REVIEW_SCOPE_STORAGE_KEY);
      setScope(preferences.defaultLevel ?? "AA");
      setOverridden(false);
    } catch {
      await showToast(Toast.Style.Failure, "Could not reset review scope");
    }
  };

  const scopeControls: ScopeControls = {
    scope,
    overridden,
    onChooseScope: (next) => void chooseScope(next),
    onResetScope: () => void resetScope(),
  };

  const visibleCriteria = useMemo(
    () => criteriaForScope(criteria, version, scope),
    [version, scope],
  );

  const switchVersion = () =>
    setVersion((current) => (current === "2.2" ? "2.1" : "2.2"));

  return (
    <List
      isLoading={!scopeLoaded || !auditLoaded}
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
          criteria={criteria}
          version={version}
          scope={scope}
          results={audits[version]}
          onReset={clearAudit}
          projectName={activeProject.name}
          auditManagement={
            <AuditManagementActions
              projects={projects}
              activeProject={activeProject}
              onSwitch={loadProject}
              onCreate={createAudit}
              onDelete={deleteAudit}
            />
          }
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
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
