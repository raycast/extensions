import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { Pool } from "../lib/runpool";

/**
 * What a pool actually covers.
 *
 * This is where the scope distinction becomes visible rather than academic.
 * GitHub has repository, organisation and enterprise scopes and no
 * user-account scope, so an organisation shares one pool across every
 * repository in it while a personal repository needs its own and can never
 * borrow the organisation's.
 *
 * Deliberately does not show workflow runs. Raycast's own GitHub extension
 * does that properly, and rebuilding it here would be a second-rate copy to
 * maintain forever. Return opens the repository's Actions page instead.
 */
export function PoolDetail({ pool }: { pool: Pool }) {
  const repos = pool.scope === "org" ? pool.watch : [pool.target];

  return (
    <List navigationTitle={`${pool.name} — ${repos.length} ${repos.length === 1 ? "repository" : "repositories"}`}>
      <List.Section
        title={pool.scope === "org" ? `Organisation pool: ${pool.target}` : "Repository pool"}
        subtitle={
          pool.scope === "org"
            ? "Every repository below shares these runners"
            : "This pool serves one repository and cannot be shared"
        }
      >
        {repos.map((repo) => (
          <List.Item
            key={repo}
            icon={{
              source: `https://github.com/${repo.split("/")[0]}.png?size=64`,
              fallback: Icon.Book,
              mask: Image.Mask.RoundedRectangle,
            }}
            title={repo}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Actions on GitHub" url={`https://github.com/${repo}/actions`} />
                <Action.OpenInBrowser
                  title="Open Repository"
                  url={`https://github.com/${repo}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.CopyToClipboard title="Copy Repository" content={repo} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {repos.length === 0 && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Repositories Listed"
          description="An organisation pool lists the repositories it watches in its config. This one has none, so nothing will wake it automatically."
        />
      )}
    </List>
  );
}
