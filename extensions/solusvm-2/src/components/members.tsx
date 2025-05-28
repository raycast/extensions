import { Color, Icon, List } from "@raycast/api";
import { Project, Member } from "../types";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, generateApiUrl } from "../api";

export default function Members({ project }: { project: Project }) {
  const { isLoading, data: members } = useFetch(generateApiUrl(`projects/${project.id}/members`), {
    headers: API_HEADERS,
    mapResult(result: { data: Member[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {members.map((member) => (
        <List.Item
          key={member.id}
          icon={{
            source: Icon.CircleFilled,
            tintColor: member.status === "active" ? Color.Green : undefined,
            tooltip: member.status,
          }}
          title={member.email}
        />
      ))}
    </List>
  );
}
