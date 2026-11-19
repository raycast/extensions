import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getActiveCredential, listSavedSkills, skillPath } from "./api";
import { getErrorMessage } from "./api-error";
import { ApiTokenForm } from "./auth";
import { SkillDetail } from "./skill-detail";
import { SkillActions } from "./skill-actions";
import { authorLabelForSkill, keywordsForSkill, savedAccessoriesForSkill } from "./skill-list-metadata";

const PAGE_SIZE = 25;

const missingApiTokenMarkdown =
  "# Saved Skills\n\nAdd a skills.re API token to view and manage your saved skills from Raycast.";

const fetchSavedSkillsPage = (token: string) => async (options: { cursor?: string }) => {
  const result = await listSavedSkills({ cursor: options.cursor, limit: PAGE_SIZE, token });

  return {
    cursor: result.continueCursor,
    data: result.page,
    hasMore: !result.isDone,
  };
};

export default function Command() {
  const {
    data: credential,
    isLoading: isCredentialLoading,
    revalidate: revalidateCredential,
  } = useCachedPromise(getActiveCredential);
  const {
    data,
    error,
    isLoading: isSkillsLoading,
    pagination,
    revalidate,
  } = useCachedPromise(fetchSavedSkillsPage, [credential?.token ?? ""], {
    execute: Boolean(credential?.token),
    failureToastOptions: { title: "Could not load saved skills" },
    keepPreviousData: true,
  });

  const skills = data ?? [];

  if (!isCredentialLoading && !credential) {
    return (
      <Detail
        markdown={missingApiTokenMarkdown}
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Key} title="Configure API Token" target={<ApiTokenForm />} />
            <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={revalidateCredential} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isCredentialLoading || isSkillsLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter saved skills"
    >
      <List.EmptyView
        description={error ? getErrorMessage(error) : "Save a skill from Search Skills to see it here."}
        icon={error ? Icon.Warning : Icon.Star}
        title={error ? "Could Not Load Saved Skills" : "No Saved Skills"}
      />
      {skills.map((skill) => (
        <List.Item
          key={skill.id}
          accessories={savedAccessoriesForSkill(skill)}
          icon={Icon.Star}
          keywords={keywordsForSkill(skill)}
          subtitle={authorLabelForSkill(skill) ?? skillPath(skill)}
          title={skill.title}
          actions={
            <SkillActions
              credential={credential}
              detailTarget={<SkillDetail credential={credential} skill={skill} />}
              skill={skill}
              onChanged={revalidate}
            />
          }
        />
      ))}
    </List>
  );
}
