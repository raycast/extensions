import { CACHE_KEYS, TEMP_DIR_PREFIX } from "#/config/constants";
import { Project } from "#/config/types";
import { formatPath, isExistingDirectory, removeDirectory } from "#/helpers/file";
import { isGitCloneUrl, parseUrlSafe } from "#/helpers/general";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { mkdtemp, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { useEffect, useRef } from "react";
import AddCommand from "./add-worktree";
import { updateCache } from "./helpers/cache";
import { cloneBareRepository, parseGitRemotes, setUpBareRepositoryFetch } from "./helpers/git";
import { getPreferences } from "./helpers/raycast";

interface CloneProjectFormInputs {
  url: string;
  directory: string[];
  repoName: string;
}

export default function Command() {
  const { push } = useNavigation();

  const preferences = getPreferences();

  const initialValues = {
    directory: [preferences.projectsPath],
  };

  const { handleSubmit, itemProps, values, setValue, setValidationError, reset } = useForm<CloneProjectFormInputs>({
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Cloning Repository",
        message: "Please wait while the repository is being cloned",
      });

      let tempDir = null;
      const finalPath = path.join(values.directory[0], values.repoName);

      try {
        // Create the temporary directory
        tempDir = await mkdtemp(path.join(tmpdir(), TEMP_DIR_PREFIX));

        // Clone the repository as a bare repository into the temporary directory
        await cloneBareRepository({ path: tempDir, url: values.url });

        toast.title = "Setting Up Repository";
        toast.message = "Please wait while the repository is being set up";

        await writeFile(path.join(tempDir, ".git"), `gitdir: ./.bare`);

        await setUpBareRepositoryFetch(tempDir);

        // Move the temporary directory to the final location
        await rename(tempDir, finalPath);

        toast.style = Toast.Style.Success;
        toast.title = "Repository Cloned & Set Up";
        toast.message = "The repository has been cloned and set up";

        // Update the worktree cache if enabled
        if (preferences.enableWorktreeCaching) {
          const pathParts = finalPath.split("/").slice(3);

          const newProject: Project = {
            id: finalPath,
            name: pathParts.at(-1) || "",
            displayPath: formatPath(finalPath),
            fullPath: finalPath,
            pathParts,
            primaryDirectory: pathParts.at(-2) || "",
            gitRemotes: await parseGitRemotes(finalPath),
            worktrees: [],
          };

          await updateCache<Project[]>({
            key: CACHE_KEYS.WORKTREES,
            updater: (projects) => {
              if (!projects) return;

              projects.push(newProject);
              return projects;
            },
          });
        }

        await updateCache<string[]>({
          key: CACHE_KEYS.DIRECTORIES,
          updater: (directories) => {
            if (!directories) return;

            directories.push(finalPath);
            return directories;
          },
        });

        reset({ url: undefined, repoName: undefined });

        push(<AddCommand directory={finalPath} />);
      } catch (e: unknown) {
        // Clean up the temporary directory if it exists
        try {
          if (!tempDir) return;
          await removeDirectory({ path: tempDir, recursive: true, force: true });
        } catch (cleanupError) {
          console.error("Failed to clean up temporary directory:", cleanupError);
        }

        if (!(e instanceof Error)) return;

        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = e.message;
      }
    },
    validation: {
      url: (value) => {
        if (!value || value.trim() === "") return "Repository URL is required";
        if (!parseUrlSafe(value)) return "Invalid URL";
        if (!isGitCloneUrl(value)) return "Invalid Repository URL";
      },
      directory: (paths) => {
        const firstPath = paths?.at(0);
        if (!firstPath) return "Directory is required";

        const parsedPath = path.parse(firstPath);
        if (!parsedPath.root || !parsedPath.dir) return "Directory path is invalid";
      },
      repoName: (value) => {
        if (!value || value.trim() === "") return "Repository Name is required";

        const firstPath = values.directory?.at(0);
        if (!firstPath) return;
      },
    },
    initialValues: initialValues,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUrlChange = (url: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      try {
        const parsedUrl = parseUrlSafe(url);
        if (!parsedUrl) return;

        if (!isGitCloneUrl(url)) return;

        const repoName = parsedUrl.pathname.split("/").at(-1)?.replace(".git", "");
        if (!repoName) return;

        setValidationError("url", undefined);
        setValue("repoName", repoName);
      } catch (error) {
        if (error instanceof Error) showToast(Toast.Style.Failure, error.message);
      }
    }, 300);
  };

  useEffect(() => {
    handleUrlChange(values.url);
  }, [values.url]);

  useEffect(() => {
    if (!values.repoName || !values.directory.length) return;

    const directory = values.directory[0];
    if (!directory) return;

    const newPath = path.join(directory, values.repoName);

    if (!isExistingDirectory(newPath)) return setValidationError("repoName", undefined);

    setValidationError("repoName", "Directory already exists");
  }, [values.directory, values.repoName]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="Repository URL" {...itemProps.url} info="Git Repository URL" />

      <Form.FilePicker
        title="Directory"
        {...itemProps.directory}
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={false}
        info="Directory to clone the repository into"
        storeValue
      />

      <Form.TextField
        title="Repository Name"
        placeholder="Repository Name"
        {...itemProps.repoName}
        info="Folder to create and clone into"
        onChange={(data) => {
          itemProps.repoName.onChange?.(data);
        }}
      />

      <Form.Description
        text={`Will clone the repository into the specified directory, with the repository name as the folder and setup a bare repo in the directory.\n\nPlease make sure to add a worktree after cloning using the add command.`}
      />
    </Form>
  );
}
