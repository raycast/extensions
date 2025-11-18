import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  getSelectedFinderItems,
  open,
  LaunchType,
  AI,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { StorageManager } from "./storage";
import { GitUtils } from "./git-utils";
import { Repository } from "./types";
import { v4 as uuidv4 } from "uuid";
import path from "path";

interface AddRepositoryProps {
  onComplete: () => void;
  initialPath?: string;
}

function AddRepository({ onComplete, initialPath }: AddRepositoryProps) {
  const [repoPath, setRepoPath] = useState(initialPath || "");
  const [repoName, setRepoName] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isValidRepo, setIsValidRepo] = useState<boolean | null>(null);
  const [existingRepo, setExistingRepo] = useState<Repository | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    if (initialPath) {
      const folderName = path.basename(initialPath);
      setRepoName(folderName);
      setRepoPath(initialPath);
    }
  }, [initialPath]);

  async function handlePathChange(newPath: string) {
    setRepoPath(newPath);
    if (newPath && !repoName) {
      const folderName = path.basename(newPath);
      setRepoName(folderName);
    }

    // Validate repository and check if it already exists
    if (newPath.trim()) {
      validateRepository(newPath);
      checkExistingRepository(newPath);
    } else {
      setIsValidRepo(null);
      setExistingRepo(null);
    }
  }

  async function validateRepository(repoPath: string) {
    try {
      const isValid = await GitUtils.isGitRepository(repoPath);
      setIsValidRepo(isValid);
    } catch {
      setIsValidRepo(false);
    }
  }

  async function checkExistingRepository(repoPath: string) {
    try {
      const repos = await StorageManager.getRepositories();
      const existing = repos.find((repo) => repo.path === repoPath);
      setExistingRepo(existing || null);
    } catch {
      setExistingRepo(null);
    }
  }

  async function selectFolder() {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0 && selectedItems[0].path) {
        const selectedPath = selectedItems[0].path;

        // First check if the selected item is a git repository
        const isGitRepo = await GitUtils.isGitRepository(selectedPath);

        if (isGitRepo) {
          // If it's a git repository, use it directly
          await handlePathChange(selectedPath);
          await showToast({
            style: Toast.Style.Success,
            title: "Git repository found",
            message: "Selected path is a valid Git repository",
          });
        } else {
          // If not a git repository, perform recursive search
          await showToast({
            style: Toast.Style.Animated,
            title: "Scanning for repositories...",
            message: "Searching for Git repositories in subdirectories",
          });

          const repositories = await GitUtils.scanForRepositories(selectedPath, 5);

          if (repositories.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No Git repositories found",
              message: "No Git repositories found in the selected directory or its subdirectories",
            });
          } else if (repositories.length === 1) {
            // If only one repository found, use it directly
            await handlePathChange(repositories[0]);
            await showToast({
              style: Toast.Style.Success,
              title: "Repository found",
              message: `Found Git repository: ${repositories[0]}`,
            });
          } else {
            // If multiple repositories found, use the first one and inform user
            await handlePathChange(repositories[0]);
            await showToast({
              style: Toast.Style.Success,
              title: "Multiple repositories found",
              message: `Found ${repositories.length} repositories. Using: ${repositories[0]}`,
            });
          }
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No folder selected",
          message: "Please select a folder in Finder first",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get selected folder",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  async function generateContextWithAI() {
    if (!repoPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a repository path first",
      });
      return;
    }

    setIsGeneratingContext(true);
    try {
      // Try to get comprehensive info about the repository to help AI generate context
      const repoInfo = await GitUtils.getRepositoryInfo(repoPath);
      const recentCommits = await GitUtils.getRecentCommits(repoPath, 5);

      // Try to detect project type by looking at common files
      const projectType = await detectProjectType(repoPath);

      // Create a comprehensive prompt for AI to generate context
      const prompt = `Analyze this Git repository and generate a comprehensive context description:

Repository Path: ${repoPath}
Current Branch: ${repoInfo.branch}
Project Type: ${projectType}

Recent Commit History:
${recentCommits.map((c, i) => `${i + 1}. ${c.message} (${c.author}, ${new Date(c.date).toLocaleDateString()})`).join("\n")}

Analysis Requirements:
Based on the repository path, branch name, project type, and commit patterns, provide a detailed context that includes:

1. **Project Domain & Purpose**: What is the main goal of this project? (e.g., e-commerce platform, internal tool, client library, etc.)

2. **Technology Stack**: What programming languages, frameworks, and tools are likely being used?

3. **Target Audience**: Who are the primary users or consumers of this project?

4. **Development Context**: What type of changes are typically made? (feature development, bug fixes, maintenance, etc.)

5. **Business Impact**: How critical is this project? What would be the impact of breaking changes?

**Output Format**: Write 3-4 concise sentences that capture the essence of this repository. Be specific and actionable for generating meaningful commit messages.

**Example Contexts**:
- "Internal microservice handling user authentication and authorization. Built with Node.js/Express, uses JWT tokens, connects to PostgreSQL. Critical for all user-facing applications."
- "React component library for company design system. Contains reusable UI components, follows accessibility standards, used by 15+ product teams."
- "Data processing pipeline for analytics team. Python-based ETL jobs processing millions of events daily. Performance and reliability are crucial."`;

      // Use Raycast AI directly for context generation
      const aiContext = await AI.ask(prompt);

      setContext(aiContext);

      await showToast({
        style: Toast.Style.Success,
        title: "Context generated successfully",
        message: "AI analyzed your repository structure and commit history",
      });
    } catch (error) {
      console.error("Failed to generate context:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate context",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsGeneratingContext(false);
    }
  }

  async function detectProjectType(repoPath: string): Promise<string> {
    try {
      const fs = await import("fs").then((m) => m.promises);
      const files = await fs.readdir(repoPath);

      // Common project indicators
      if (files.includes("package.json")) return "Node.js/JavaScript";
      if (files.includes("Cargo.toml")) return "Rust";
      if (files.includes("go.mod")) return "Go";
      if (files.includes("pom.xml")) return "Java/Maven";
      if (files.includes("build.gradle")) return "Java/Gradle";
      if (files.includes("requirements.txt") || files.includes("setup.py")) return "Python";
      if (files.includes("Gemfile")) return "Ruby";
      if (files.includes("composer.json")) return "PHP";
      if (files.some((f) => f.endsWith(".csproj"))) return ".NET/C#";
      if (files.some((f) => f.endsWith(".swift"))) return "Swift/iOS";
      if (files.includes("AndroidManifest.xml")) return "Android";

      return "Multi-language/Unknown";
    } catch {
      return "Unknown";
    }
  }

  async function handleSubmit() {
    if (!repoPath.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Repository path is required",
      });
      return;
    }

    if (!repoName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Repository name is required",
      });
      return;
    }

    if (isValidRepo === false) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Git repository",
        message: "The selected path is not a valid Git repository",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verify it's a valid Git repository
      const isValidRepoCheck = await GitUtils.isGitRepository(repoPath);
      if (!isValidRepoCheck) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not a Git repository",
          message: "The selected path is not a valid Git repository",
        });
        return;
      }

      // Get repository information
      const repoInfo = await GitUtils.getRepositoryInfo(repoPath);

      if (existingRepo) {
        // Update existing repository
        const updatedRepo: Repository = {
          ...existingRepo,
          displayName: repoName,
          context: context || undefined,
          branch: repoInfo.branch || existingRepo.branch,
          hasChanges: repoInfo.hasChanges || false,
          changedFilesCount: repoInfo.changedFilesCount || 0,
          lastCommit: repoInfo.lastCommit || existingRepo.lastCommit,
        };

        await StorageManager.updateRepository(existingRepo.id, updatedRepo);

        await showToast({
          style: Toast.Style.Success,
          title: "Repository updated successfully",
          message: repoName,
        });
      } else {
        // Create new repository
        const newRepo: Repository = {
          id: uuidv4(),
          path: repoPath,
          name: path.basename(repoPath),
          displayName: repoName,
          branch: repoInfo.branch || "unknown",
          lastUsed: Date.now(),
          useCount: 0,
          isPinned: false,
          hasChanges: repoInfo.hasChanges || false,
          changedFilesCount: repoInfo.changedFilesCount || 0,
          lastCommit: repoInfo.lastCommit,
          context: context || undefined,
        };

        await StorageManager.addRepository(newRepo);

        await showToast({
          style: Toast.Style.Success,
          title: "Repository added successfully",
          message: repoName,
        });
      }

      onComplete();
      pop();
    } catch (error) {
      console.error("Failed to save repository:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: existingRepo ? "Failed to update repository" : "Failed to add repository",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={existingRepo ? "Update Repository" : "Add Repository"}
      isLoading={isLoading || isGeneratingContext}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingRepo ? "Update Repository" : "Add Repository"}
            onSubmit={handleSubmit}
            icon={existingRepo ? Icon.ArrowClockwise : Icon.Plus}
          />
          <Action
            title="Use Selected Finder Item"
            icon={Icon.Finder}
            onAction={selectFolder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          {repoPath && (
            <Action
              title="Open in Finder"
              icon={Icon.NewFolder}
              onAction={() => open(repoPath, LaunchType.UserInitiated)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action
            title="Generate Context with AI"
            icon={Icon.Wand}
            onAction={generateContextWithAI}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="path"
        title="Repository Path"
        value={repoPath ? [repoPath] : []}
        onChange={(files) => {
          if (files.length > 0) {
            handlePathChange(files[0]);
          } else {
            handlePathChange("");
          }
        }}
        info={
          isValidRepo === true
            ? "Valid Git repository"
            : isValidRepo === false
              ? "Not a valid Git repository"
              : repoPath
                ? "Validating repository..."
                : "Select a folder containing a Git repository"
        }
        error={
          isValidRepo === false
            ? "This path is not a valid Git repository. Please select a folder with a .git directory."
            : undefined
        }
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.TextField
        id="name"
        title="Display Name"
        placeholder="My Repository"
        value={repoName}
        onChange={setRepoName}
        info="This name will be shown in the repository list"
      />

      <Form.TextArea
        id="context"
        title="Repository Context"
        placeholder="Describe what this repository is about to help AI generate better commit messages"
        value={context}
        onChange={setContext}
        info="Tip: Use the AI button in the action panel to automatically generate context based on your repository's structure and recent commits"
      />
    </Form>
  );
}

export { AddRepository };
