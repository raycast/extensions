import { useState, useEffect } from "react";
import { Form, List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, Color } from "@raycast/api";
import { Octokit } from "@octokit/rest";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

interface ClaudeOAuthData {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
  };
}

interface SelectedRepo {
  id: number;
  name: string;
  full_name: string;
}

const STORAGE_KEY = "claude-tokens-selected-repos";
const GITHUB_TOKEN_KEY = "claude-tokens-github-token";

// Step 1: GitHub Token Input
function GitHubTokenForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [savedToken, setSavedToken] = useState<string>("");

  useEffect(() => {
    LocalStorage.getItem<string>(GITHUB_TOKEN_KEY).then((token) => {
      if (token) setSavedToken(token);
    });
  }, []);

  async function handleSubmit(values: { githubToken: string }) {
    setIsLoading(true);
    const token = values.githubToken || savedToken;

    try {
      // Validate token by making a simple API call
      const octokit = new Octokit({ auth: token });
      await octokit.users.getAuthenticated();

      // Save token for future use
      await LocalStorage.setItem(GITHUB_TOKEN_KEY, token);

      showToast({
        style: Toast.Style.Success,
        title: "GitHub token validated",
      });

      onSubmit(token);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid GitHub token",
        message: "Please check your token and try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Step 1: GitHub Authentication"
        text="Enter your GitHub personal access token with 'repo' scope"
      />

      <Form.PasswordField
        id="githubToken"
        title="GitHub Token"
        placeholder={savedToken ? "Using saved token (leave empty to keep)" : "ghp_..."}
        info="Personal access token with 'repo' scope for managing secrets"
      />

      {savedToken && <Form.Description text="✓ Using previously saved token" />}
    </Form>
  );
}

// Step 2: Repository Selection
function RepositorySelector({
  githubToken,
  onSubmit,
}: {
  githubToken: string;
  onSubmit: (repos: SelectedRepo[]) => void;
}) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchRepositories();
    loadSavedSelections();
  }, []);

  async function loadSavedSelections() {
    const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (saved) {
      const savedRepos: SelectedRepo[] = JSON.parse(saved);
      setSelectedRepos(new Set(savedRepos.map((r) => r.id)));
    }
  }

  async function fetchRepositories() {
    try {
      const octokit = new Octokit({ auth: githubToken });
      const repos: Repository[] = [];

      // Fetch all repositories (handling pagination)
      for await (const response of octokit.paginate.iterator(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        sort: "updated",
      })) {
        repos.push(...response.data);
      }

      setRepositories(repos);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelection(repo: Repository) {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repo.id)) {
      newSelected.delete(repo.id);
    } else {
      newSelected.add(repo.id);
    }
    setSelectedRepos(newSelected);
  }

  async function handleContinue() {
    const selected = repositories
      .filter((repo) => selectedRepos.has(repo.id))
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
      }));

    if (selected.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No repositories selected",
        message: "Please select at least one repository",
      });
      return;
    }

    // Save selection for future use
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(selected));

    onSubmit(selected);
  }

  const filteredRepos = repositories.filter((repo) => repo.full_name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search repositories..." onSearchTextChange={setSearchText}>
      <List.Section title={`Selected: ${selectedRepos.size} repositories`}>
        {filteredRepos.map((repo) => (
          <List.Item
            key={repo.id}
            title={repo.name}
            subtitle={repo.owner.login}
            icon={{
              source: selectedRepos.has(repo.id) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selectedRepos.has(repo.id) ? Color.Green : Color.SecondaryText,
            }}
            actions={
              <ActionPanel>
                <Action
                  title={selectedRepos.has(repo.id) ? "Deselect" : "Select"}
                  icon={selectedRepos.has(repo.id) ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggleSelection(repo)}
                />
                <Action
                  title="Continue with Selected"
                  icon={Icon.ArrowRight}
                  onAction={handleContinue}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.OpenInBrowser title="Open in GitHub" url={`https://github.com/${repo.full_name}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// Step 3: Claude OAuth JSON Input and Update
function ClaudeTokenUpdater({
  githubToken,
  selectedRepos,
  onComplete,
}: {
  githubToken: string;
  selectedRepos: SelectedRepo[];
  onComplete: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function getPublicKey(octokit: Octokit, owner: string, repo: string) {
    const { data } = await octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });
    return data;
  }

  async function encryptSecret(secret: string, publicKey: string): Promise<string> {
    const sealedbox = await import("tweetnacl-sealedbox-js");

    const messageBytes = Buffer.from(secret);
    const publicKeyBytes = Buffer.from(publicKey, "base64");

    const encryptedBytes = sealedbox.seal(messageBytes, publicKeyBytes);

    return Buffer.from(encryptedBytes).toString("base64");
  }

  async function updateRepositorySecrets(
    octokit: Octokit,
    owner: string,
    repo: string,
    oauthData: ClaudeOAuthData["claudeAiOauth"],
  ) {
    const publicKey = await getPublicKey(octokit, owner, repo);

    const secrets = [
      {
        name: "CLAUDE_ACCESS_TOKEN",
        value: oauthData.accessToken,
      },
      {
        name: "CLAUDE_REFRESH_TOKEN",
        value: oauthData.refreshToken,
      },
      {
        name: "CLAUDE_EXPIRES_AT",
        value: oauthData.expiresAt.toString(),
      },
    ];

    for (const secret of secrets) {
      const encryptedValue = await encryptSecret(secret.value, publicKey.key);

      await octokit.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: secret.name,
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id,
      });
    }
  }

  async function handleSubmit(values: { claudeJsonData: string }) {
    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Processing...",
    });

    try {
      // Parse Claude OAuth JSON
      let oauthData: ClaudeOAuthData;
      try {
        oauthData = JSON.parse(values.claudeJsonData);
      } catch (e) {
        throw new Error("Invalid JSON format");
      }

      // Validate OAuth data structure
      if (
        !oauthData.claudeAiOauth ||
        !oauthData.claudeAiOauth.accessToken ||
        !oauthData.claudeAiOauth.refreshToken ||
        !oauthData.claudeAiOauth.expiresAt
      ) {
        throw new Error("Missing required OAuth fields");
      }

      const octokit = new Octokit({ auth: githubToken });

      // Update each selected repository
      let successCount = 0;
      const errors: string[] = [];

      for (const repo of selectedRepos) {
        try {
          toast.title = `Updating ${repo.name}...`;

          const [owner, repoName] = repo.full_name.split("/");
          await updateRepositorySecrets(octokit, owner, repoName, oauthData.claudeAiOauth);

          successCount++;
        } catch (error) {
          errors.push(`${repo.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      if (successCount === selectedRepos.length) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully updated ${successCount} repositories`;
      } else if (successCount > 0) {
        toast.style = Toast.Style.Success;
        toast.title = `Updated ${successCount}/${selectedRepos.length} repositories`;
        toast.message = "Some repositories failed. Check the logs.";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update repositories";
        toast.message = errors.join(", ");
      }

      if (successCount > 0) {
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update tokens";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tokens" onSubmit={handleSubmit} />
          <Action title="Back to Repository Selection" icon={Icon.ArrowLeft} onAction={onComplete} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Step 3: Update Claude Tokens"
        text={`Updating ${selectedRepos.length} repositories with Claude OAuth tokens`}
      />

      <Form.TextArea
        id="claudeJsonData"
        title="Claude OAuth JSON"
        placeholder='{"claudeAiOauth":{"accessToken":"...","refreshToken":"...","expiresAt":...}}'
        info="Paste the Claude OAuth JSON data"
      />

      <Form.Description title="Selected Repositories" text={selectedRepos.map((r) => `• ${r.full_name}`).join("\n")} />

      <Form.Description
        title="Secrets to be created/updated"
        text="• CLAUDE_ACCESS_TOKEN
• CLAUDE_REFRESH_TOKEN  
• CLAUDE_EXPIRES_AT"
      />
    </Form>
  );
}

// Main Component with Step Management
export default function UpdateClaudeTokens() {
  const [step, setStep] = useState<"token" | "repos" | "update">("token");
  const [githubToken, setGithubToken] = useState<string>("");
  const [selectedRepos, setSelectedRepos] = useState<SelectedRepo[]>([]);

  useEffect(() => {
    // Check if we have a saved token to skip step 1
    LocalStorage.getItem<string>(GITHUB_TOKEN_KEY).then((token) => {
      if (token) {
        setGithubToken(token);
        setStep("repos");
      }
    });
  }, []);

  function handleTokenSubmit(token: string) {
    setGithubToken(token);
    setStep("repos");
  }

  function handleRepoSelection(repos: SelectedRepo[]) {
    setSelectedRepos(repos);
    setStep("update");
  }

  function handleComplete() {
    setStep("repos");
  }

  if (step === "token") {
    return <GitHubTokenForm onSubmit={handleTokenSubmit} />;
  }

  if (step === "repos") {
    return <RepositorySelector githubToken={githubToken} onSubmit={handleRepoSelection} />;
  }

  return <ClaudeTokenUpdater githubToken={githubToken} selectedRepos={selectedRepos} onComplete={handleComplete} />;
}
