import { Icon, Keyboard, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { getSubmissions, Submission, submissionTitle } from "./lib/bricks-data";
import { HelperMissingError } from "./lib/design";
import { ProLicenseError } from "./lib/license";
import { loadSites, Site } from "./lib/sites";
import { getSeen, setSeen } from "./lib/submissions-seen";
import { WordPressError } from "./lib/wordpress";

interface SiteCheck {
  site: Site;
  /** Newest submissions since the last time they were seen. */
  latest: Submission[];
  count: number;
  maxId: number;
  error?: string;
  /** The site can't report submissions at all (older helper, not an administrator); not worth a warning every time. */
  unsupported?: boolean;
}

/** New form submissions on every site that has an application password. */
async function checkSites(): Promise<SiteCheck[]> {
  const sites = (await loadSites()).filter((site) => site.username && site.appPassword);
  return Promise.all(
    sites.map(async (site): Promise<SiteCheck> => {
      try {
        const seen = await getSeen(site.id);
        const result = await getSubmissions(site, { afterId: seen ?? 0, perPage: 5 });
        if (seen === undefined) {
          // First check: start counting from now instead of calling every old submission new.
          await setSeen(site.id, result.max_id);
          return { site, latest: [], count: 0, maxId: result.max_id };
        }
        return { site, latest: result.submissions, count: result.total, maxId: result.max_id };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof ProLicenseError) {
          return { site, latest: [], count: 0, maxId: 0, error: "Needs Bricks Raycast Pro", unsupported: true };
        }
        const unsupported =
          error instanceof HelperMissingError ||
          (error instanceof WordPressError && (error.status === 401 || error.status === 403 || error.status === 404));
        return { site, latest: [], count: 0, maxId: 0, error: message, unsupported };
      }
    }),
  );
}

export default function Command() {
  // Submissions hold people's names and messages, so they aren't written to Raycast's (unencrypted)
  // cache; only the count is kept, so the menu bar title shows right away.
  const [cachedTotal, setCachedTotal] = useCachedState("forms:menu-bar:total", 0);
  const { data, isLoading, revalidate } = usePromise(checkSites, [], {
    onData: (checks) => setCachedTotal(checks.reduce((sum, check) => sum + check.count, 0)),
  });
  const allChecks = data ?? [];
  const checks = allChecks.filter((check) => !check.unsupported);
  const unsupported = allChecks.filter((check) => check.unsupported);
  const total = data ? checks.reduce((sum, check) => sum + check.count, 0) : cachedTotal;

  async function openSubmissions(siteId: string, formId?: string) {
    await launchCommand({
      name: "form-submissions",
      type: LaunchType.UserInitiated,
      context: { siteId, formId: formId ?? "" },
    });
  }

  async function markRead(check: SiteCheck) {
    await setSeen(check.site.id, check.maxId);
    revalidate();
  }

  return (
    <MenuBarExtra
      icon={Icon.Envelope}
      title={total > 0 ? String(total) : undefined}
      tooltip={total > 0 ? `${total} new Bricks form submissions` : "No new Bricks form submissions"}
      isLoading={isLoading}
    >
      {allChecks.length === 0 && !isLoading && (
        <MenuBarExtra.Item title="Add a site with an application password to see submissions" />
      )}
      {checks.map((check) => (
        <MenuBarExtra.Section
          key={check.site.id}
          title={`${check.site.name}${check.count ? ` · ${check.count} new` : ""}`}
        >
          {check.error && <MenuBarExtra.Item icon={Icon.Warning} title={check.error} />}
          {!check.error && check.count === 0 && <MenuBarExtra.Item title="No new submissions" />}
          {check.latest.map((submission) => (
            <MenuBarExtra.Item
              key={submission.id}
              icon={Icon.Envelope}
              title={submissionTitle(submission)}
              subtitle={submission.form_name}
              onAction={() => openSubmissions(check.site.id, submission.form_id)}
            />
          ))}
          {check.count > check.latest.length && (
            <MenuBarExtra.Item
              title={`${check.count - check.latest.length} more…`}
              onAction={() => openSubmissions(check.site.id)}
            />
          )}
          {check.count > 0 && (
            <MenuBarExtra.Item title="Mark as Read" icon={Icon.CheckCircle} onAction={() => markRead(check)} />
          )}
        </MenuBarExtra.Section>
      ))}
      {unsupported.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu
            icon={Icon.Info}
            title={`${unsupported.length} ${unsupported.length === 1 ? "site doesn't" : "sites don't"} report submissions`}
          >
            {unsupported.map((check) => (
              <MenuBarExtra.Item key={check.site.id} title={check.site.name} subtitle={check.error} />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Form Submissions"
          icon={Icon.List}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchCommand({ name: "form-submissions", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Check Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
