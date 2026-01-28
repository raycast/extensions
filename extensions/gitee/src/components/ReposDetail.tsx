import { ActionPanel, Color, Detail } from "@raycast/api";
import { Repository } from "../types/repository";
import { getRepoREADME } from "../hooks/hooks";
import { isEmpty } from "../utils/common-utils";
import { ReposAction } from "./ReposAction";
import React from "react";

export function ReposDetail(props: { repo: Repository }) {
  const { repo } = props;
  const { readme, loading } = getRepoREADME(repo.namespace.path, repo.path);

  return (
    <Detail
      isLoading={loading}
      navigationTitle={repo.human_name}
      markdown={repo.description + "\n ------ \n" + readme}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title={"Owner"} text={repo.owner.name} target={repo.owner.html_url} />
          <Detail.Metadata.Label title={"Star"} text={repo.stargazers_count + ""} />
          <Detail.Metadata.Label title={"Fork"} text={repo.forks_count + ""} />
          <Detail.Metadata.Label title={"Open Issue"} text={repo.open_issues_count + ""} />
          <Detail.Metadata.Label title={"Last Update"} text={repo.updated_at.substring(0, 10)} />

          {!isEmpty(repo.language) && <Detail.Metadata.Label title={"Language"} text={repo.language + ""} />}
          {!isEmpty(repo.license) && <Detail.Metadata.Label title={"License"} text={repo.license + ""} />}
          {repo.project_labels.length !== 0 && (
            <Detail.Metadata.TagList title="Labels">
              {repo.project_labels.map((label) => {
                return <Detail.Metadata.TagList.Item text={label.name} color={Color.Orange} />;
              })}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.TagList title="Members">
            {repo.members.map((member) => {
              return <Detail.Metadata.TagList.Item text={member} color={Color.Green} />;
            })}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ReposAction repo={repo} showDetail={false} />
        </ActionPanel>
      }
    />
  );
}
