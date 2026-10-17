import { Action, ActionPanel, Clipboard, Form, Icon, List, Toast, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { getErrorMessage } from "./helpers/errors";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useRepositoryBranches } from "./hooks/useRepositoryBranches";

type ReleaseFormValues = {
  tag: string;
  title: string;
  target: string;
  draft: boolean;
  prerelease: boolean;
  notes: string;
};

const RELEASES_PAGE_SIZE = 30;

function suggestNextTag(latestTag: string): string {
  if (!latestTag) {
    return "v1.0.0";
  }

  const match = latestTag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return "";
  }

  const [, major, minor, patch] = match;
  const prefix = latestTag.startsWith("v") ? "v" : "";
  return `${prefix}${major}.${minor}.${Number(patch) + 1}`;
}

function CreateRelease() {
  const { octokit } = getGitHubClient();
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);

  const { data, isLoading, mutate } = useCachedPromise(
    async (repository: string | null) => {
      // `execute` above already guards this; the annotation keeps `args: Parameters<T>` happy.
      if (!repository) {
        return [];
      }

      const [owner, repo] = repository.split("/");
      const { data } = await octokit.repos.listReleases({ owner, repo, per_page: RELEASES_PAGE_SIZE });
      return data;
    },
    [selectedRepository],
    { execute: Boolean(selectedRepository) },
  );

  const releases = data ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Create Release"
      searchBarPlaceholder="Filter releases by tag or name"
      searchBarAccessory={
        <RepositoriesDropdown setSelectedRepository={setSelectedRepository} withAllRepositories={false} />
      }
    >
      {selectedRepository ? (
        <List.Item
          title="Create Release"
          subtitle={selectedRepository}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Release"
                icon={Icon.Plus}
                target={<ReleaseForm repository={selectedRepository} onCreated={mutate} />}
              />
              <Action.OpenInBrowser
                title="Open Releases in Browser"
                url={`https://github.com/${selectedRepository}/releases`}
              />
              <Action
                title="Refresh Releases"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => mutate()}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {selectedRepository
        ? releases.map((release) => (
            <List.Item
              key={release.id}
              title={release.name || release.tag_name}
              subtitle={release.draft ? "Draft" : release.prerelease ? "Pre-release" : undefined}
              icon={release.draft ? Icon.Circle : Icon.CheckCircle}
              accessories={[
                { tag: release.tag_name },
                {
                  date: new Date(release.published_at ?? release.created_at),
                  tooltip: release.published_at
                    ? `Published at: ${new Date(release.published_at).toLocaleString()}`
                    : `Created at: ${new Date(release.created_at).toLocaleString()}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Release"
                    icon={Icon.Plus}
                    target={<ReleaseForm repository={selectedRepository} onCreated={mutate} />}
                  />
                  <Action.OpenInBrowser url={release.html_url} />
                  <Action.CopyToClipboard
                    title="Copy Release URL"
                    content={release.html_url}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
                  />
                  <Action
                    title="Refresh Releases"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => mutate()}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}

      {!selectedRepository ? (
        <List.EmptyView
          title="Select a Repository"
          description="Choose a repository from the dropdown to see its releases."
          icon={Icon.Tag}
        />
      ) : null}
    </List>
  );
}

type ReleaseFormProps = {
  repository: string;
  onCreated?: () => void;
};

function ReleaseForm({ repository, onCreated }: ReleaseFormProps) {
  const { octokit } = getGitHubClient();
  const [owner, repo] = repository.split("/");
  const [notesAreGenerated, setNotesAreGenerated] = useState(false);

  const { data: branchesData, isLoading: branchesIsLoading } = useRepositoryBranches(repository);

  const { data: latestRelease, isLoading: latestReleaseIsLoading } = useCachedPromise(
    async (owner: string, repo: string) => {
      const { data } = await octokit.repos.listReleases({ owner, repo, per_page: 1 });
      return data[0] ?? null;
    },
    [owner, repo],
  );

  const suggestedTag = latestReleaseIsLoading ? "" : suggestNextTag(latestRelease?.tag_name ?? "");

  const { handleSubmit, itemProps, values, setValue } = useForm<ReleaseFormValues>({
    async onSubmit(formValues) {
      const notes = formValues.notes.trim();
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating release" });

      try {
        const { data } = await octokit.repos.createRelease({
          owner,
          repo,
          tag_name: formValues.tag.trim(),
          target_commitish: formValues.target,
          name: formValues.title.trim() || undefined,
          body: notes || undefined,
          generate_release_notes: !notes,
          draft: formValues.draft,
          prerelease: formValues.prerelease,
        });

        toast.style = Toast.Style.Success;
        toast.title = `Created release ${data.tag_name}`;
        toast.primaryAction = {
          title: "Open Release in Browser",
          shortcut: { modifiers: ["shift", "cmd"], key: "o" },
          onAction: () => open(data.html_url),
        };
        toast.secondaryAction = {
          title: "Copy Release URL",
          shortcut: { modifiers: ["shift", "cmd"], key: "c" },
          onAction: () => Clipboard.copy(data.html_url),
        };

        onCreated?.();
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed creating release";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      tag: "",
      title: "",
      target: "",
      draft: false,
      prerelease: false,
      notes: "",
    },
    validation: {
      tag: FormValidation.Required,
      target: FormValidation.Required,
    },
  });

  const notesRequestId = useRef(0);
  const appliedSuggestions = useRef(false);
  useEffect(() => {
    if (appliedSuggestions.current || latestReleaseIsLoading) {
      return;
    }

    appliedSuggestions.current = true;
    setValue("tag", suggestedTag);
    setValue("title", suggestedTag);
  }, [latestReleaseIsLoading, suggestedTag]);

  const appliedTarget = useRef(false);
  useEffect(() => {
    if (appliedTarget.current || branchesIsLoading || !branchesData) {
      return;
    }

    appliedTarget.current = true;
    setValue("target", branchesData.branches.includes("main") ? "main" : branchesData.defaultBranch);
  }, [branchesData, branchesIsLoading]);

  function invalidateGeneratedNotes() {
    notesRequestId.current += 1;
  }

  async function generateNotes() {
    const tag = values.tag.trim();
    const target = values.target || undefined;

    if (!tag) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a tag first" });
      return;
    }

    const requestId = ++notesRequestId.current;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating release notes" });

    try {
      const { data } = await octokit.repos.generateReleaseNotes({
        owner,
        repo,
        tag_name: tag,
        target_commitish: target,
      });

      if (requestId !== notesRequestId.current) {
        await toast.hide();
        return;
      }

      setValue("notes", data.body ?? "");
      setNotesAreGenerated(true);
      toast.style = Toast.Style.Success;
      toast.title = "Release notes generated";
    } catch (error) {
      if (requestId !== notesRequestId.current) {
        await toast.hide();
        return;
      }

      toast.style = Toast.Style.Failure;
      toast.title = "Failed generating release notes";
      toast.message = getErrorMessage(error);
    }
  }

  function handleTagChange(tag: string) {
    invalidateGeneratedNotes();
    const previousTag = values.tag;
    setValue("tag", tag);

    if (!values.title || values.title === previousTag) {
      setValue("title", tag);
    }

    if (notesAreGenerated) {
      setValue("notes", "");
      setNotesAreGenerated(false);
    }
  }

  function handleTargetChange(target: string) {
    invalidateGeneratedNotes();
    setValue("target", target);

    if (notesAreGenerated) {
      setValue("notes", "");
      setNotesAreGenerated(false);
    }
  }

  function handleNotesChange(notes: string) {
    invalidateGeneratedNotes();
    setValue("notes", notes);

    if (notesAreGenerated) {
      setNotesAreGenerated(false);
    }
  }

  const navigationTitle = latestRelease ? `${repository} · ${latestRelease.tag_name}` : repository;

  return (
    <Form
      isLoading={branchesIsLoading || latestReleaseIsLoading}
      navigationTitle={navigationTitle}
      searchBarAccessory={
        latestRelease ? (
          <Form.LinkAccessory text={`Latest release: ${latestRelease.tag_name}`} target={latestRelease.html_url} />
        ) : latestReleaseIsLoading ? undefined : (
          <Form.LinkAccessory text="No releases yet" target={`https://github.com/${repository}/releases`} />
        )
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Release" icon={Icon.Upload} onSubmit={handleSubmit} />
          <Action
            title={notesAreGenerated ? "Regenerate Release Notes" : "Generate Release Notes"}
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={generateNotes}
          />
          <Action.OpenInBrowser title="Open Releases in Browser" url={`https://github.com/${repository}/releases`} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.tag}
        title="Tag"
        placeholder="v1.0.0"
        info={suggestedTag ? `Suggested: ${suggestedTag}` : undefined}
        onChange={handleTagChange}
      />

      <Form.TextField {...itemProps.title} title="Title" placeholder="Defaults to the tag name" />

      <Form.Dropdown {...itemProps.target} title="Target" onChange={handleTargetChange}>
        {(branchesData?.branches ?? []).map((branch) => (
          <Form.Dropdown.Item key={branch} title={branch} value={branch} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox {...itemProps.draft} label="Draft" />

      <Form.Checkbox {...itemProps.prerelease} label="Pre-release" />

      <Form.Separator />

      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Generate notes from merged pull requests (⌘G) or write your own Markdown."
        enableMarkdown
        info="Leave empty to let GitHub generate the release notes automatically."
        onChange={handleNotesChange}
      />
    </Form>
  );
}

export default withGitHubClient(CreateRelease);
