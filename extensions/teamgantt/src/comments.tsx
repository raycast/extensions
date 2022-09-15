import { Detail, Icon, List } from '@raycast/api';
import { Comment } from './types';

interface Props {
  comments: Comment[];
}

export default function Comments({ comments }: Props) {
  if (!comments.length) {
    return <Detail navigationTitle="Comments" markdown="No comments" />;
  }
  return (
    <List navigationTitle="Comments">
      {comments.map((comment) => {
        const addedBy = comment.added_by;
        const name = `${addedBy.first_name}${addedBy.last_name ?? ''}`;
        return <List.Item title={name} subtitle={comment.added_date} icon={comment.is_read ? undefined : Icon.Dot} />;
      })}
    </List>
  );
}
