import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

const SKILLS_URL = "https://skills.sh/";

type Skill = {
  rank: number;
  name: string;
  repo: string;
  installs: string;
};

async function fetchSkills(signal?: AbortSignal): Promise<Skill[]> {
  const response = await fetch(SKILLS_URL, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch skills: ${response.status}`);
  }

  const html = await response.text();

  const matches: Skill[] = [];
  const seen = new Set<string>();
  const regex =
    /href="\/([^/]+)\/([^/]+)\/([^"]+)"[\s\S]*?<span[^>]*>(\d+)<\/span>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const rank = Number(match[4]);
    const name = match[5].trim();
    const repo = match[6].trim();
    const installs = match[7].trim();
    const key = `${rank}-${name}-${repo}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    matches.push({ rank, name, repo, installs });
  }

  return matches.sort((a, b) => a.rank - b.rank);
}

async function runInstallCommand(command: string) {
  const script = `tell application "Terminal"\nactivate\ndo script ${JSON.stringify(command)}\nend tell`;
  await runAppleScript(script);
}

export default function Command() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortOption, setSortOption] = useState<
    "rank" | "popularity" | "company"
  >("rank");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dropdownValue, setDropdownValue] = useState<string>("sort:rank");
  const [lastDropdownValue, setLastDropdownValue] =
    useState<string>("sort:rank");

  const loadSkills = useCallback(async (controller: AbortController) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchSkills(controller.signal);
      setSkills(data);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load skills",
        message,
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSkills(controller);
    return () => controller.abort();
  }, [loadSkills, reloadKey]);

  const filteredSkills = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      if (companyFilter === "all") {
        return skills;
      }
      return skills.filter(
        (skill) => skill.repo.split("/")[0] === companyFilter,
      );
    }

    const tokens = query.split(/\s+/).filter(Boolean);
    const isSubsequence = (needle: string, haystack: string) => {
      let i = 0;
      for (const char of haystack) {
        if (char === needle[i]) {
          i += 1;
          if (i >= needle.length) {
            return true;
          }
        }
      }
      return needle.length === 0;
    };

    return skills.filter((skill) => {
      const name = skill.name.toLowerCase();
      const repo = skill.repo.toLowerCase();
      const haystack = `${name} ${repo}`;
      const owner = skill.repo.split("/")[0];

      if (companyFilter !== "all" && owner !== companyFilter) {
        return false;
      }

      return tokens.every((token) => {
        if (haystack.includes(token)) {
          return true;
        }
        return isSubsequence(
          token.replace(/[^a-z0-9]/g, ""),
          haystack.replace(/[^a-z0-9]/g, ""),
        );
      });
    });
  }, [skills, searchText, companyFilter]);

  const companyOptions = useMemo(() => {
    const owners = new Set<string>();
    for (const skill of skills) {
      const owner = skill.repo.split("/")[0];
      if (owner) {
        owners.add(owner);
      }
    }
    return Array.from(owners).sort((a, b) => a.localeCompare(b));
  }, [skills]);

  const sortedSkills = useMemo(() => {
    const list = [...filteredSkills];
    const parseInstalls = (value: string) => {
      const trimmed = value.trim().toUpperCase();
      const match = trimmed.match(/^([0-9.]+)([KMB])?$/);
      if (!match) {
        return 0;
      }
      const num = Number(match[1]);
      const unit = match[2];
      if (unit === "B") return num * 1_000_000_000;
      if (unit === "M") return num * 1_000_000;
      if (unit === "K") return num * 1_000;
      return num;
    };

    if (sortOption === "popularity") {
      return list.sort(
        (a, b) => parseInstalls(b.installs) - parseInstalls(a.installs),
      );
    }
    if (sortOption === "company") {
      return list.sort((a, b) => {
        const aOwner = a.repo.split("/")[0] ?? "";
        const bOwner = b.repo.split("/")[0] ?? "";
        const ownerCompare = aOwner.localeCompare(bOwner);
        if (ownerCompare !== 0) return ownerCompare;
        return a.name.localeCompare(b.name);
      });
    }
    return list.sort((a, b) => a.rank - b.rank);
  }, [filteredSkills, sortOption]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search skills by name or repo..."
      navigationTitle={
        companyFilter === "all"
          ? "Skills Directory"
          : `Skills Directory · ${companyFilter}`
      }
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh Skills List"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => setReloadKey((key) => key + 1)}
          />
          <Action.OpenInBrowser
            title="Open Skills Directory"
            url={SKILLS_URL}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort or filter skills"
          value={dropdownValue}
          onChange={(value) => {
            if (value.startsWith("action:")) {
              if (value === "action:refresh") {
                setReloadKey((key) => key + 1);
              }
              setDropdownValue(lastDropdownValue);
              return;
            }
            setDropdownValue(value);
            setLastDropdownValue(value);
            if (value.startsWith("sort:")) {
              setSortOption(
                value.replace("sort:", "") as "rank" | "popularity" | "company",
              );
              return;
            }
            if (value.startsWith("company:")) {
              setCompanyFilter(value.replace("company:", ""));
            }
          }}
        >
          <List.Dropdown.Section title="Sort">
            <List.Dropdown.Item value="sort:rank" title="Rank (Default)" />
            <List.Dropdown.Item value="sort:popularity" title="Popularity" />
            <List.Dropdown.Item value="sort:company" title="Company" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Company Filter">
            <List.Dropdown.Item value="company:all" title="All Companies" />
            {companyOptions.map((company) => (
              <List.Dropdown.Item
                key={company}
                value={`company:${company}`}
                title={company}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Actions">
            <List.Dropdown.Item
              value="action:refresh"
              title="Refresh Skills List"
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {errorMessage ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load skills"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => setReloadKey((key) => key + 1)}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {sortedSkills.map((skill) => (
        <List.Item
          key={`${skill.rank}-${skill.repo}`}
          title={skill.name}
          subtitle={skill.repo}
          accessories={[
            { text: `#${skill.rank}` },
            { text: `${skill.installs} installs` },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`npx skills add ${skill.repo}`}
              />
              <Action
                title="Refresh Skills List"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => setReloadKey((key) => key + 1)}
              />
              <Action
                title="Install Skill"
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onAction={async () => {
                  try {
                    await runInstallCommand(`npx skills add ${skill.repo}`);
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Unknown error";
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Install failed",
                      message,
                    });
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy Install Command (No Telemetry)"
                content={`SKILLS_NO_TELEMETRY=1 npx skills add ${skill.repo}`}
              />
              <Action
                title="Refresh Skills List (Force)"
                onAction={() => setReloadKey((key) => key + 1)}
              />
              <Action
                title="Install Skill (No Telemetry)"
                onAction={async () => {
                  try {
                    await runInstallCommand(
                      `SKILLS_NO_TELEMETRY=1 npx skills add ${skill.repo}`,
                    );
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Unknown error";
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Install failed",
                      message,
                    });
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`npx skills add ${skill.repo}`}
              />
              <Action.CopyToClipboard title="Copy Repo" content={skill.repo} />
              <Action.OpenInBrowser
                title="Open Skills Directory"
                url={SKILLS_URL}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
