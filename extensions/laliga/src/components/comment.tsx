import { Color, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getMatchComments } from "../api";
import { MatchCommentary } from "../types";

export default function MatchComments(props: { slug: string; name: string }) {
  const [comments, setComments] = useState<MatchCommentary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setComments([]);

    getMatchComments(props.slug).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [props.slug]);

  return (
    <List navigationTitle={`Comments | ${props.name}`} isLoading={loading}>
      {comments.map((comment) => {
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
