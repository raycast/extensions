import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { getActiveCredential, listSavedSkills, skillPath } from "./api";
import type { AuthCredential, SavedSkill } from "./api";
import { getErrorMessage } from "./api-error";
import { ApiTokenForm } from "./auth";
import { createSingleFlight } from "./request-generation";
import { SkillDetail } from "./skill-detail";
import { SkillActions } from "./skill-actions";
import { authorLabelForSkill, keywordsForSkill, savedAccessoriesForSkill } from "./skill-list-metadata";

const missingApiTokenMarkdown =
  "# Saved Skills\n\nAdd a skills.re API token to view and manage your saved skills from Raycast.";

export default function Command() {
  const [credential, setCredential] = useState<AuthCredential | null>(null);
  const [skills, setSkills] = useState<SavedSkill[]>([]);
  const [cursor, setCursor] = useState("");
  const [isDone, setIsDone] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [runLoadMore] = useState(createSingleFlight);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeCredential = await getActiveCredential();
      if (!activeCredential) {
        setCredential(null);
        setSkills([]);
        setCursor("");
        setIsDone(true);
        return;
      }
      setCredential(activeCredential);
      const result = await listSavedSkills({ limit: 25, token: activeCredential.token });
      setSkills(result.page);
      setCursor(result.continueCursor);
      setIsDone(result.isDone);
    } catch (error) {
      await showToast({
        message: getErrorMessage(error),
        style: Toast.Style.Failure,
        title: "Could not load saved skills",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = async () => {
    if (!credential || !cursor || isDone) {
      return;
    }

    await runLoadMore(async () => {
      setIsLoading(true);
      try {
        const result = await listSavedSkills({ cursor, limit: 25, token: credential.token });
        setSkills((current) => [...current, ...result.page]);
        setCursor(result.continueCursor);
        setIsDone(result.isDone);
      } catch (error) {
        await showToast({
          message: getErrorMessage(error),
          style: Toast.Style.Failure,
          title: "Could not load more saved skills",
        });
      } finally {
        setIsLoading(false);
      }
    });
  };

  if (!isLoading && !credential) {
    return (
      <Detail
        markdown={missingApiTokenMarkdown}
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Key} title="Configure API Token" target={<ApiTokenForm />} />
            <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter saved skills">
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
              onChanged={refresh}
            />
          }
        />
      ))}
      {isDone ? null : (
        <List.Item
          icon={Icon.ArrowDownCircle}
          title="Load More"
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowDownCircle} title="Load More" onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
