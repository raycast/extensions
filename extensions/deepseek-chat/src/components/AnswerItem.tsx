import { List, ActionPanel, Action, Icon } from '@raycast/api';

interface AnswerItemProps {
  text: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  onSubmit: () => void;
}

export function AnswerItem({ text, status, onSubmit }: AnswerItemProps) {
  const statusText = status === 'streaming' ? '回答中...' : status === 'error' ? '出错了' : '回答完成';
  const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;

  return (
    <List.Item
      title={statusText}
      subtitle={preview || undefined}
      icon={status === 'streaming' ? Icon.CircleProgress : status === 'error' ? Icon.Warning : Icon.Message}
      detail={<List.Item.Detail markdown={text || '等待回答...'} isLoading={status === 'streaming'} />}
      actions={
        <ActionPanel>
          <Action title="新问题" onAction={onSubmit} />
          <Action.CopyToClipboard content={text} title="复制回答" shortcut={{ modifiers: ['cmd'], key: 'c' }} />
        </ActionPanel>
      }
    />
  );
}
