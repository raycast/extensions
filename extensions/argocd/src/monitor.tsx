/**
 * The menu bar command: what is broken, without opening anything.
 *
 * It runs on an interval, so it does two jobs at once. It reports, and it keeps the on-disk
 * cache warm, which is what makes Search Applications paint instantly the rest of the time.
 * That is only affordable because the read path streams: 3 MB gzipped per instance, projected
 * element by element, peaking around 35 MB against the 100 MB command heap.
 *
 * It never prompts. A background command cannot ask for a login, so an instance that fails
 * authentication is reported as such with an item that opens the place to fix it, and the menu
 * keeps showing the last numbers it had rather than emptying.
 */

import { Color, Icon, MenuBarExtra, getPreferenceValues, open, openCommandPreferences, type Image } from "@raycast/api";
import { useEffect, useState } from "react";
import type { AppSummary } from "./lib/argocd/types";
import type { ArgoInstance } from "./lib/config/instances";
import {
  monitorState,
  type MonitorState,
  monitorTitle,
  monitorTooltip,
  summarize,
  type MonitorInstance,
  type MonitorSummary,
} from "./lib/monitor/summary";
import { makeClient } from "./ui/deps";
import { openManageInstances, openSearchApplications } from "./ui/launch";
import { loadApplications } from "./ui/loadApplications";
import { environmentColor, healthIcon, humanAge, syncIcon } from "./ui/statusVisuals";
import { loadInstances } from "./ui/storage";

/** How many applications one section lists before the rest is left to the search command. */
const PER_SECTION = 12;

/**
 * A problem state gets a semantic icon; everything else gets the extension's own mark.
 *
 * The first version used a faint grey circle when healthy and while loading, with no title. In
 * a menu bar holding a dozen items that is indistinguishable from nothing, and the honest
 * report was "I cannot see it". An item that cannot be found is not a quieter report, it is an
 * absent one.
 */
const STATE_ICON: Record<MonitorState, Image.ImageLike> = {
  degraded: { source: Icon.HeartDisabled, tintColor: Color.Red },
  missing: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
  drifting: { source: Icon.ArrowClockwise, tintColor: Color.Yellow },
  stale: { source: Icon.WifiDisabled, tintColor: Color.Orange },
  healthy: "argocd.png",
  empty: "argocd.png",
};

export default function Monitor() {
  const [summary, setSummary] = useState<MonitorSummary | undefined>(undefined);
  const [instances, setInstances] = useState<ArgoInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const configured = await loadInstances();
      const enabled = configured.filter((instance) => instance.enabled);
      if (cancelled) {
        return;
      }
      setInstances(enabled);

      const loaded = await loadApplications(enabled, { cancelled: () => cancelled });
      if (cancelled) {
        return;
      }
      setSummary(
        summarize(
          loaded.map((state) => ({
            instance: state.instance,
            apps: state.apps,
            error: state.error,
            ageSeconds: state.ageSeconds,
          })),
        ),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const state: MonitorState = summary ? monitorState(summary) : "empty";
  // A title while loading is what makes the item findable on the very first run, which is
  // exactly when someone is looking for it.
  const title = summary ? monitorTitle(summary, { showWhenHealthy: preferences().showWhenHealthy }) : "ArgoCD";

  return (
    <MenuBarExtra
      icon={STATE_ICON[state]}
      title={title}
      tooltip={summary ? monitorTooltip(summary) : "Loading ArgoCD applications"}
      isLoading={loading}
    >
      {instances.length === 0 ? (
        <MenuBarExtra.Item
          title="No ArgoCD instance configured"
          subtitle="Open Manage Instances"
          onAction={() => void openManageInstances()}
        />
      ) : null}

      {(summary?.instances ?? []).map((instance) => (
        <InstanceSections key={instance.id} instance={instance} all={instances} />
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Applications"
          icon={Icon.MagnifyingGlass}
          onAction={() => void openSearchApplications()}
        />
        <MenuBarExtra.Item title="Manage Instances" icon={Icon.Gear} onAction={() => void openManageInstances()} />
        <MenuBarExtra.Item title="Configure This Menu" icon={Icon.Cog} onAction={() => void openCommandPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function preferences(): { showWhenHealthy: boolean } {
  // Preferences.Monitor is generated from the manifest, so a renamed preference is a type
  // error here rather than a silent `undefined` that reads as "off".
  const raw = getPreferenceValues<Preferences.Monitor>();
  return { showWhenHealthy: raw.showWhenHealthy === true };
}

function InstanceSections({ instance, all }: { instance: MonitorInstance; all: ArgoInstance[] }) {
  const configured = all.find((candidate) => candidate.id === instance.id);
  const age = instance.ageSeconds === undefined ? "never refreshed" : humanAge(instance.ageSeconds);

  // The reason is what makes this actionable: unreachable and unauthenticated need different
  // fixes, and the menu cannot ask for either.
  const subtitle = instance.problem ? `${age}, ${instance.problem.split(".")[0]}` : age;

  // Routed on the kind of failure, not on words in the message. Both failures a person can
  // act on lead to Manage Instances, which is a command and so launched, not opened as a URL.
  const fixableHere = instance.problemKind === "unreachable" || instance.problemKind === "auth" || !configured?.baseUrl;
  const problemAction = fixableHere ? () => void openManageInstances() : () => void open(configured.baseUrl);

  function appItem(app: AppSummary) {
    return (
      <MenuBarExtra.Item
        key={`${app.instanceId}/${app.namespace}/${app.name}`}
        title={app.name}
        subtitle={app.project}
        icon={app.health === "Degraded" || app.health === "Missing" ? healthIcon(app.health) : syncIcon(app.sync)}
        onAction={() => {
          if (configured) {
            void open(makeClient(configured).appUrl(app.name, app.namespace));
          }
        }}
      />
    );
  }

  return (
    <>
      <MenuBarExtra.Section title={`${instance.name} (${instance.env})`}>
        <MenuBarExtra.Item
          title={instance.problem ? "Numbers may be stale" : `${instance.total} applications`}
          subtitle={subtitle}
          icon={{
            source: instance.problem ? Icon.ExclamationMark : Icon.Box,
            tintColor: instance.problem ? Color.Orange : environmentColor(instance.env),
          }}
          onAction={problemAction}
        />
      </MenuBarExtra.Section>

      {instance.degraded.length > 0 ? (
        <MenuBarExtra.Section title={`Degraded (${instance.degraded.length})`}>
          {instance.degraded.slice(0, PER_SECTION).map(appItem)}
          {instance.degraded.length > PER_SECTION ? (
            <MenuBarExtra.Item
              title={`${instance.degraded.length - PER_SECTION} more`}
              onAction={() => void openSearchApplications()}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {instance.missing.length > 0 ? (
        <MenuBarExtra.Section title={`Missing (${instance.missing.length})`}>
          {instance.missing.slice(0, PER_SECTION).map(appItem)}
          {instance.missing.length > PER_SECTION ? (
            <MenuBarExtra.Item
              title={`${instance.missing.length - PER_SECTION} more`}
              onAction={() => void openSearchApplications()}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {instance.outOfSync.length > 0 ? (
        <MenuBarExtra.Section title={`Out of sync (${instance.outOfSync.length})`}>
          {instance.outOfSync.slice(0, PER_SECTION).map(appItem)}
          {instance.outOfSync.length > PER_SECTION ? (
            <MenuBarExtra.Item
              title={`${instance.outOfSync.length - PER_SECTION} more`}
              onAction={() => void openSearchApplications()}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
    </>
  );
}
