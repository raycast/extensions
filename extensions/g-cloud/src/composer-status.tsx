// Menu bar (disabled by default): failed Airflow DAG runs in the last 24h, per Composer environment in
// the current project. Only regions where the last full scan (at most a day old) found environments are
// queried; Refresh rescans every region.

import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { compareEnvironments, listEnvironments } from "./services/composer/lib/composer";
import { hoursAgoIso, relativeTime } from "./services/composer/lib/format";
import {
  FAILURE_WINDOW_HOURS,
  clientFor,
  currentProject,
  errorText,
  knownLocations,
  queryable,
  scanEnvironments,
  tokens,
} from "./services/composer/lib/raycast";
import { ComposerEnvironment, DagRun } from "./services/composer/lib/types";

const MAX_PER_ENV = 100;

interface EnvResult {
  env: ComposerEnvironment;
  runs: DagRun[];
  total: number;
  error?: string;
}

interface StatusResult {
  project?: string;
  results: EnvResult[];
  /** Environment lookup failed (auth, API disabled, network): we could not check anything. */
  lookupError?: string;
  /** Some regions could not be listed, so environments there may be missing. */
  partialErrors: string[];
}

// Set by Refresh: rescan every region instead of trusting the remembered ones.
let forceFullScan = false;

function openCommand(name: string) {
  return async () => {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (e) {
      await showFailureToast(e, { title: "Could not open command" });
    }
  };
}

async function loadStatus(project: string | undefined, hours: number): Promise<StatusResult> {
  if (!project) return { results: [], partialErrors: [] };
  const full = forceFullScan;
  forceFullScan = false;
  const known = full ? undefined : knownLocations(project);
  let listing;
  try {
    listing = known?.length
      ? await listEnvironments(tokens(), [project], known)
      : await scanEnvironments([project], full);
  } catch (e) {
    return { project, results: [], lookupError: errorText(e), partialErrors: [] };
  }
  if (listing.errors.length && !listing.environments.length) {
    return { project, results: [], lookupError: listing.errors[0].message, partialErrors: [] };
  }
  const partialErrors = listing.errors.map((e) => `${e.location}: ${e.message}`);
  const envs = queryable(listing.environments).sort(compareEnvironments);
  const results = await Promise.all(
    envs.map(async (env): Promise<EnvResult> => {
      try {
        const { runs, total } = await clientFor(env).queryDagRuns(
          { states: ["failed"], start_date_gte: hoursAgoIso(hours), order_by: "-start_date" },
          { max: MAX_PER_ENV },
        );
        return { env, runs, total };
      } catch (e) {
        return { env, runs: [], total: 0, error: errorText(e) };
      }
    }),
  );
  return { project, results, partialErrors };
}

export default function Command() {
  const hours = FAILURE_WINDOW_HOURS;
  const { data, isLoading, revalidate } = useCachedPromise(loadStatus, [currentProject(), hours]);

  const results = data?.results ?? [];
  const total = results.reduce((n, r) => n + r.total, 0);
  const errored = results.filter((r) => r.error).length;
  const partial = data?.partialErrors?.length ?? 0;
  // Anything we could not check makes a green "all clear" untrustworthy.
  const incomplete = !!data && (!data.project || !!data.lookupError || errored > 0 || partial > 0);
  const icon = total
    ? { source: Icon.XMarkCircle, tintColor: Color.Red }
    : incomplete
      ? { source: Icon.QuestionMarkCircle, tintColor: Color.Orange }
      : { source: Icon.CheckCircle, tintColor: Color.Green };
  const tooltip = !data?.project
    ? "No Google Cloud project selected"
    : data.lookupError
      ? `Could not list Composer environments in ${data.project}`
      : `${total} failed Airflow runs in last ${hours}h in ${data.project}${errored ? ` · ${errored} env errors` : ""}${
          partial ? ` · ${partial} regions not checked` : ""
        }`;
  const refresh = () => {
    forceFullScan = true;
    revalidate();
  };

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} title={total ? String(total) : undefined} tooltip={tooltip}>
      {data && !data.project && (
        <MenuBarExtra.Item title="Select a project in Composer Environments" icon={Icon.Warning} />
      )}
      {data?.lookupError && <MenuBarExtra.Item title={data.lookupError.slice(0, 80)} icon={Icon.Warning} />}
      {data?.partialErrors?.map((e) => (
        <MenuBarExtra.Item key={e} title={`Incomplete: ${e}`.slice(0, 80)} icon={Icon.Warning} />
      ))}
      {data?.project && !data.lookupError && results.length === 0 && (
        <MenuBarExtra.Item title={`No running Composer environments in ${data.project}`} icon={Icon.Info} />
      )}
      {results.map(({ env, runs, total: t, error }) => (
        <MenuBarExtra.Section key={env.name} title={`${env.id} · ${error ? "error" : `${t} failed`}`}>
          {error && <MenuBarExtra.Item title={error.slice(0, 80)} icon={Icon.Warning} />}
          {runs.slice(0, 8).map((r) => (
            <MenuBarExtra.Item
              key={`${r.dag_id}|${r.dag_run_id}`}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              title={r.dag_id}
              subtitle={relativeTime(r.start_date)}
              onAction={() => open(clientFor(env).uiRunUrl(r.dag_id, r.dag_run_id))}
            />
          ))}
          <MenuBarExtra.Item title="Open Airflow UI" icon={Icon.Globe} onAction={() => open(env.airflowUri)} />
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Recent Failures" icon={Icon.List} onAction={openCommand("composer-failures")} />
        <MenuBarExtra.Item title="Open Composer Environments" icon={Icon.Cloud} onAction={openCommand("composer")} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
