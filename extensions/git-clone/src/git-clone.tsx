import { List, ActionPanel, Action, showToast, Toast, useNavigation, Form, getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";

const preferences = getPreferenceValues();
const PERSONAL_ACCESS_TOKEN = preferences.personalAccessToken as string;
const DEFAULT_CLONE_PATH = preferences.defaultClonePath as string;
interface Repository {
  fullName: string;
  name: string;
  owner: string;
}

interface Organization {
  login: string;
  name?: string;
  description: string | null;
}

interface Branch {
  name: string;
}

async function fetchBranches(owner: string, repo: string): Promise<Branch[]> {
  const octokit = new Octokit({
    auth: PERSONAL_ACCESS_TOKEN,
    request: {
      fetch: fetch,
    },
  });
  const response = await octokit.repos.listBranches({ owner, repo });
  return response.data.map((branch) => ({ name: branch.name }));
}

function RepositoryList({ owner }: { owner: string }) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchRepositories() {
      setIsLoading(true);
      try {
        const octokit = new Octokit({
          auth: PERSONAL_ACCESS_TOKEN,
          request: {
            fetch: fetch,
          },
        });
        let repos;
        if (owner === "personal") {
          repos = await octokit.repos.listForAuthenticatedUser();
        } else {
          repos = await octokit.repos.listForOrg({ org: owner });
        }
        const allRepos = repos.data.map((repo) => ({
          fullName: repo.full_name,
          name: repo.name,
          owner: repo.owner.login,
        }));
        setRepositories(allRepos);
      } catch (error) {
        console.error("Error fetching repositories:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch repositories",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRepositories();
  }, [owner]);

  return (
    <List isLoading={isLoading}>
      {repositories.map((repo) => (
        <List.Item
          key={repo.fullName}
          title={repo.name}
          subtitle={repo.owner}
          actions={
            <ActionPanel>
              <Action title="Select Repository" onAction={() => push(<CloneForm repository={repo} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CloneForm({ repository }: { repository: Repository }) {
  const [directory, setDirectory] = useState(DEFAULT_CLONE_PATH);
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      setIsLoadingBranches(true);
      try {
        const fetchedBranches = await fetchBranches(repository.owner, repository.name);
        setBranches(fetchedBranches);
        if (fetchedBranches.length > 0) {
          setBranch(fetchedBranches[0].name);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch branches",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoadingBranches(false);
      }
    }
    loadBranches();
  }, [repository]);

  function handleSubmit() {
    const url = `https://github.com/${repository.fullName}.git`;
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const cloneDir = path.join(directory, repository.name);

      execSync(`git clone -b ${branch} ${url} "${cloneDir}"`);
      showToast({
        style: Toast.Style.Success,
        title: "Repository cloned successfully",
        message: `Cloned ${url} to ${cloneDir}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to clone repository",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="directory"
        title="Clone Directory"
        placeholder="Enter or select directory"
        value={directory}
        onChange={setDirectory}
      />
      <Form.Dropdown id="branch" title="Branch" value={branch} onChange={setBranch} isLoading={isLoadingBranches}>
        {branches.map((b) => (
          <Form.Dropdown.Item key={b.name} value={b.name} title={b.name} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Please select the clone destination directory and the branch to clone" />
      <Form.Separator />
      <Form.Description text={`Repository to clone: ${repository.fullName}`} />
    </Form>
  );
}

export default function Command() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchOrganizations() {
      setIsLoading(true);
      try {
        const octokit = new Octokit({
          auth: PERSONAL_ACCESS_TOKEN,
          request: {
            fetch: fetch,
          },
        });
        const orgs = await octokit.orgs.listForAuthenticatedUser();
        const formattedOrgs: Organization[] = orgs.data.map((org) => ({
          login: org.login,
          name: org.login,
          description: org.description,
        }));
        setOrganizations(formattedOrgs);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch organizations",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="MyRepo_and_OwnerRepo"
        actions={
          <ActionPanel>
            <Action title="Select" onAction={() => push(<RepositoryList owner="personal" />)} />
          </ActionPanel>
        }
      />
      {organizations.map((org) => (
        <List.Item
          key={org.login}
          title={org.name || org.login}
          subtitle={org.description || ""}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => push(<RepositoryList owner={org.login} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
