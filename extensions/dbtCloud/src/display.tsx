import { Color, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ExplorerEnvironment, formatRelativeTime } from "./api";
import { DEPLOYMENT_TYPE_INFO, inferDeploymentType } from "./environment_utils";
import { returnEnvironments } from "./fetch_environments";
import { returnProjects } from "./fetch_projects";
import { EnvironmentModel } from "./types";

// Shared presentation so status, context and dates look the same in every list and sidebar

interface StatusStyle {
  label: string;
  color: Color;
  icon: Icon;
}

const RUN_STATUS: Record<number, StatusStyle> = {
  1: { label: "Queued", color: Color.Yellow, icon: Icon.Clock },
  2: { label: "Starting", color: Color.Orange, icon: Icon.Clock },
  3: { label: "Running", color: Color.Blue, icon: Icon.CircleProgress50 },
  10: { label: "Success", color: Color.Green, icon: Icon.CheckCircle },
  20: { label: "Error", color: Color.Red, icon: Icon.XMarkCircle },
  30: { label: "Cancelled", color: Color.SecondaryText, icon: Icon.MinusCircle },
};

export const runStatus = (status: number): StatusStyle =>
  RUN_STATUS[status] ?? { label: "Unknown", color: Color.SecondaryText, icon: Icon.QuestionMarkCircle };

const MODEL_STATUS: Record<string, StatusStyle> = {
  success: { label: "Success", color: Color.Green, icon: Icon.CheckCircle },
  warn: { label: "Warn", color: Color.Yellow, icon: Icon.Warning },
  error: { label: "Error", color: Color.Red, icon: Icon.XMarkCircle },
  skipped: { label: "Skipped", color: Color.SecondaryText, icon: Icon.MinusCircle },
  reused: { label: "Reused", color: Color.SecondaryText, icon: Icon.ArrowClockwise },
};

export const modelStatus = (status: string | null | undefined): StatusStyle | undefined =>
  MODEL_STATUS[status?.toLowerCase() ?? ""];

export const freshnessColor = (status: string | null | undefined): Color => {
  switch (status?.toLowerCase()) {
    case "pass":
      return Color.Green;
    case "warn":
      return Color.Yellow;
    case "error":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
};

const DEPLOYMENT_COLOR = {
  production: Color.Green,
  staging: Color.Orange,
  development: Color.Blue,
  general: Color.SecondaryText,
};

export const environmentTag = (environment: EnvironmentModel): { value: string; color: Color } => {
  const type = inferDeploymentType(environment);
  return { value: DEPLOYMENT_TYPE_INFO[type].displayName, color: DEPLOYMENT_COLOR[type] };
};

// Green at 95%+, yellow at 80%+, red below
export const successRateColor = (rate: number | null): Color =>
  rate === null ? Color.SecondaryText : rate >= 95 ? Color.Green : rate >= 80 ? Color.Yellow : Color.Red;

export const formatDateTime = (date: string): string =>
  new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// List accessory: Raycast renders the relative time, the tooltip gives the exact one
export const dateAccessory = (date: string | null | undefined, label: string): List.Item.Accessory =>
  date ? { date: new Date(date), tooltip: `${label}: ${formatDateTime(date)}` } : { text: "—", tooltip: label };

export function DateLabel({ title, date }: { title: string; date: string | null | undefined }) {
  return (
    <Detail.Metadata.Label title={title} text={date ? `${formatRelativeTime(date)} · ${formatDateTime(date)}` : "—"} />
  );
}

// Project and environment names, cached across commands; the Admin API list endpoints do not include them.
// One request is shared by every view in the command, so many sidebars and links do not each refetch.
let namesRequest: { at: number; promise: Promise<AccountNames> } | undefined;
interface AccountNames {
  projects: Record<number, string>;
  environments: Record<number, EnvironmentModel>;
}

function loadAccountNames(): Promise<AccountNames> {
  if (!namesRequest || Date.now() - namesRequest.at > 60_000) {
    const promise = Promise.all([returnProjects(), returnEnvironments()]).then(([projects, environments]) => ({
      projects: Object.fromEntries(projects.map((p) => [p.id, p.name])),
      environments: Object.fromEntries(environments.map((e) => [e.id, e])),
    }));
    namesRequest = { at: Date.now(), promise };
  }
  return namesRequest.promise;
}

export function useAccountNames() {
  const { data } = useCachedPromise(loadAccountNames, [], { keepPreviousData: true });
  return {
    projectName: (id: number) => data?.projects[id] ?? `Project ${id}`,
    environment: (id: number): EnvironmentModel | undefined => data?.environments[id],
    environmentName: (id: number) => data?.environments[id]?.name ?? `Environment ${id}`,
  };
}

// Sidebar block placing a record in the hierarchy: Project › Environment › Job
export function ContextMetadata({
  projectId,
  environmentId,
  jobName,
}: {
  projectId: number;
  environmentId?: number;
  jobName?: string;
}) {
  const names = useAccountNames();
  const environment = environmentId ? names.environment(environmentId) : undefined;
  return (
    <>
      {projectId > 0 && (
        <Detail.Metadata.Label title="Project" text={names.projectName(projectId)} icon={Icon.Folder} />
      )}
      {environmentId ? (
        <Detail.Metadata.TagList title="Environment">
          <Detail.Metadata.TagList.Item
            text={names.environmentName(environmentId)}
            color={environment ? environmentTag(environment).color : Color.SecondaryText}
          />
        </Detail.Metadata.TagList>
      ) : null}
      {jobName && <Detail.Metadata.Label title="Job" text={jobName} icon={Icon.Hammer} />}
    </>
  );
}

// dbt Explorer only has staging pages for environments whose deployment type is "staging"; everything else
// (including a "general" environment named Staging) is linked to production
export function useExplorerEnvironment() {
  const names = useAccountNames();
  return (environmentId: number): ExplorerEnvironment =>
    names.environment(environmentId)?.deployment_type === "staging" ? "staging" : "production";
}
