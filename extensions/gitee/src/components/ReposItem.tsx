import { Repository } from "../types/repository";
import { ActionPanel, Image, List } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import React from "react";
import { ReposAction } from "./ReposAction";
import Mask = Image.Mask;

export function ReposItem(props: { repo: Repository }) {
  const { repo } = props;
  return (
    <List.Item
      id={repo.id + ""}
      key={repo.id + ""}
      icon={{ source: repo.owner.avatar_url, mask: Mask.Circle }}
      title={repo.human_name}
      subtitle={repo.stargazers_count === 0 ? "" : `🌟 ${repo.stargazers_count}`}
      accessories={[
        isEmpty(repo.language) ? {} : { text: repo.language + "", tooltip: "Language" },
        {
          text: repo.updated_at.substring(0, 10),
          tooltip: "Updated: " + repo.updated_at.replace("T", " ").substring(0, 19),
        },
      ]}
      actions={
        <ActionPanel>
          <ReposAction repo={repo} showDetail={true} />
        </ActionPanel>
      }
    />
  );
}
