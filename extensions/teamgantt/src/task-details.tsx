import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api';
import { useEffect, useState } from 'react';
import { getComments } from './api';
import Comments from './comments';
import { Comment, Task } from './types';

interface Props {
  task: Task;
  idToken?: string;
}

export default function TaskDetails({ task, idToken }: Props) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    getComments(task, idToken)
      .then((items) => setComments(items))
      .finally(() => setIsLoading(false));
  }, [idToken, task]);

  if (!idToken) {
    return <Detail navigationTitle={task.name} markdown="Not authenticated, press Escape to return to previous view" />;
  }

  const note = comments.find((comment) => comment.type === 'note');
  const commentsWithoutNote = comments
    .filter((item) => item !== note)
    .sort((a, b) => (a.added_date > b.added_date ? -1 : 1));

  const actions = (
    <ActionPanel>
      <Action
        title="View Comments"
        icon={Icon.Bubble}
        onAction={() => push(<Comments comments={commentsWithoutNote} />)}
      />
    </ActionPanel>
  );

  if (!note) {
    return <Detail navigationTitle={task.name} markdown="No note on this task" actions={actions} />;
  }

  return <Detail navigationTitle={task.name} markdown={note.message} isLoading={isLoading} actions={actions} />;
}
