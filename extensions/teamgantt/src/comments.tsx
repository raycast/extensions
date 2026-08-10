import { Detail, Icon, List } from '@raycast/api';
import { Comment } from './types';

interface Props {
  comments: Comment[];
}

export default function Comments({ comments }: Props) {
  if (!comments.length) {
    return <Detail navigationTitle="Comments" markdown="No comments" />;
  }

  const sortedComments = comments.sort((a, b) => (a.added_date > b.added_date ? -1 : 1));

  return (
    <List navigationTitle="Comments" isShowingDetail={true}>
      {sortedComments.map((comment) => {
        const addedBy = comment.added_by;
        const name = `${addedBy.first_name}${addedBy.last_name ?? ''}`;

        return (
          <List.Item
            key={comment.added_date}
            title={name}
            subtitle={comment.added_date}
            icon={comment.is_read ? undefined : Icon.Dot}
            detail={<List.Item.Detail markdown={comment.message} />}
          />
        );
      })}
    </List>
  );
}
