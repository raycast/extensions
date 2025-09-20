import { useSpace } from "../hooks/use-space";
import { Project } from "../types/types";
import { List } from "@raycast/api";

type Revision = {
  id: string;
  tag: string;
  app_id: string;
  app_name: string;
  created_at: string;
  updated_at: string;
};

type RevisionsResponse = {
  revisions: Revision[];
};

export default function RevisionList(props: { project: Project }) {
  const { data, isLoading } = useSpace<RevisionsResponse>(`/apps/${props.project.id}/revisions`);

  return (
    <List isLoading={isLoading} navigationTitle={props.project.name}>
      {data?.revisions
        .sort((a, b) => {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
        .map((revision) => (
          <List.Item
            key={revision.id}
            title={revision.tag}
            subtitle={revision.id}
            accessories={[{ date: new Date(revision.created_at) }]}
          />
        ))}
    </List>
  );
}
