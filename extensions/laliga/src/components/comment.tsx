import { Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMatchComments } from "../api";

export default function MatchComments(props: { slug: string; name: string }) {
  const {
    data: comments,
    isLoading,
    pagination,
  } = usePromise(
    (slug) =>
      ({ page = 0 }) =>
        getMatchComments(slug, page),
    [props.slug],
  );

  return (
    <List navigationTitle={`${props.name} | Comments`} isLoading={isLoading} pagination={pagination}>
      {comments?.map((comment) => {
        return (
          <List.Item
            key={comment.id}
            title={comment.time === 0 ? "-" : `${comment.time}'`}
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
