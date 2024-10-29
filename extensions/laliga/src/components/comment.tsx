import { Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMatchComments } from "../api";

export default function MatchComments(props: { slug: string; name: string }) {
  const { data: comments, isLoading } = usePromise(getMatchComments, [props.slug]);

  return (
    <List navigationTitle={`Comments | ${props.name}`} isLoading={isLoading}>
      {comments?.map((comment) => {
        return (
          <List.Item
            key={comment.id}
            title={comment.time === 0 || !comment.minute ? "-" : comment.minute.toString()}
            subtitle={comment.content}
            keywords={[comment.content]}
            icon={{
              source: `icons/${comment.match_comment_kind.id}.svg`,
              tintColor: Color.PrimaryText,
            }}
          />
        );
      })}
    </List>
  );
}
