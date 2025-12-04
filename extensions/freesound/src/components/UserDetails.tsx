import htmlToMarkdown from "@wcj/html-to-markdown";
import { useMemo } from "react";

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";

import type { User } from "@/types";

import { getAuthHeaders } from "@/lib/api";

const UserDetails = ({ userName }: { userName: string }) => {
  const { data, isLoading, error } = useFetch<User>(`https://freesound.org/apiv2/users/${userName}/`, {
    headers: getAuthHeaders(),
  });

  const { data: about } = usePromise(
    async (text?: string) => {
      if (!text) {
        return "";
      }
      const markdown = await htmlToMarkdown({ html: text });
      return markdown
        .split(/\r?\n/)
        .map((s) => s.trim())
        .join("\n\n");
    },
    [data?.about],
  );

  const markdown = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (error) {
      return `Error loading ${userName}: \n\n\`\`\`${error.message}\`\`\``;
    }
    if (!data) {
      return `User ${userName} not found`;
    }

    return `# ${data.username}
${data.avatar?.large ? `![Avatar](${data.avatar.large})` : ""}

${about && about.length > 0 ? `---\n${about}\n---` : ""}
`;
  }, [data, isLoading, error, userName]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            {data.date_joined ? (
              <Detail.Metadata.Label
                title="Joined"
                icon={Icon.Calendar}
                text={new Date(data.date_joined).toLocaleDateString()}
              />
            ) : null}
            <Detail.Metadata.Separator />
            {data?.num_sounds ? (
              <Detail.Metadata.Label title="Sounds" icon={Icon.Waveform} text={data.num_sounds.toString()} />
            ) : null}
            {data?.num_packs ? (
              <Detail.Metadata.Label title="Packs" icon={Icon.Box} text={data.num_packs.toString()} />
            ) : null}
            {data?.num_posts ? (
              <Detail.Metadata.Label title="Posts" icon={Icon.Bubble} text={data.num_posts.toString()} />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          {data?.url ? <Action.OpenInBrowser title="Open Profile in Browser" url={data.url} icon={Icon.Globe} /> : null}
        </ActionPanel>
      }
    />
  );
};

export default UserDetails;
