import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from '@raycast/api';
import { useState, useRef } from 'react';
import { useStream } from './hooks/useStream';
import { useHistory } from './hooks/useHistory';
import { AnswerItem } from './components/AnswerItem';
import { HistoryItem } from './components/HistoryItem';

interface Preferences {
  apiKey: string;
  model: 'deepseek-chat' | 'deepseek-reasoner';
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { text, status, submit, reset } = useStream(preferences);
  const { history, addEntry } = useHistory();
  const [searchText, setSearchText] = useState('');
  const searchTextRef = useRef('');

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return;
    try {
      const answer = await submit(question);
      addEntry({ question, answer, model: preferences.model });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(Toast.Style.Failure, '请求失败', msg);
    }
  };

  const handleNewQuestion = () => {
    reset();
    setSearchText('');
    searchTextRef.current = '';
  };

  const currentQuestion = searchTextRef.current;

  const showDetail = status !== 'idle' || history.length > 0;

  return (
    <List
      searchBarPlaceholder="请输入你的问题..."
      searchText={searchText}
      isShowingDetail={showDetail}
      onSearchTextChange={(text) => {
        setSearchText(text);
        searchTextRef.current = text;
      }}
    >
      {/* Submit action - always visible so Enter works */}
      {status === 'idle' && (
        <List.Item
          title={currentQuestion ? `提问: ${currentQuestion}` : '输入问题后按回车提交'}
          icon={currentQuestion ? Icon.ArrowRight : Icon.Message}
          detail={
            <List.Item.Detail
              markdown={
                currentQuestion
                  ? `## 即将提问\n\n${currentQuestion}\n\n按 **Enter** 提交`
                  : '## DeepSeek Chat\n\n在搜索框输入问题，按 **Enter** 提交'
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="提交问题" onAction={() => handleSubmit(currentQuestion)} />
            </ActionPanel>
          }
        />
      )}

      {/* Current answer */}
      {status !== 'idle' && <AnswerItem text={text} status={status} onSubmit={handleNewQuestion} />}

      {/* History */}
      <List.Section title="历史记录">
        {history.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
    </List>
  );
}
