import { useEffect, useState } from 'react';
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';
import { LANGUAGES } from '@utils/languages';
import useOpenAITranslate from '@hooks/useOpenAITranslate';
import Configuration from '@views/configuration';
import { getAllParamsFromLocalStorage } from '@utils/parameters';

export default function Translate() {
  const { push } = useNavigation();
  const { data, error, isLoading, translate } = useOpenAITranslate();
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        title: 'Error occurred when translating with OpenAI',
        message: error,
        style: Toast.Style.Failure,
      });
    } else if (isLoading) {
      showToast({
        title: 'Translating...',
        style: Toast.Style.Animated,
      });
    } else if (!isFirstRender && !isLoading) {
      showToast({
        title: 'Succeeded',
        style: Toast.Style.Success,
      });
    }
  }, [isLoading, error]);

  return (
    <Form
      actions={
        <ActionPanel title='OpenAI Translate'>
          <ActionPanel.Section>
            <Action.SubmitForm
              title='Translate'
              icon={Icon.Globe}
              onSubmit={async (values) => {
                const { text, from, to } = values;
                const parameters = await getAllParamsFromLocalStorage();
                translate({
                  openAiConfig: {
                    openaiApiKey: getPreferenceValues().openAiApiKey,
                    ...parameters,
                  },
                  text,
                  from,
                  to,
                });
              }}
            />
            <Action.CopyToClipboard content={data.content?.trim() || ''} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title='Change API Key'
              icon={Icon.Key}
              onAction={() => openCommandPreferences()}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'k' }}
            />
          </ActionPanel.Section>
          <Action
            title='Configure Parameters'
            icon={Icon.Gear}
            onAction={() => push(<Configuration />)}
            shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id='text' title='Text' autoFocus={true} />
      {/* TODO: add token count here */}
      <Form.Dropdown id='from' title='From' storeValue={true}>
        {renderLanguageList()}
      </Form.Dropdown>
      <Form.Dropdown id='to' title='To' storeValue={true}>
        {renderLanguageList(true)}
      </Form.Dropdown>
      <Form.TextArea
        id='translation'
        value={data.content?.trim() || ''}
        title='Translation'
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onChange={() => {}}
      />
    </Form>
  );
}

const renderLanguageList = (filterOutAuto = false) =>
  Object.entries(LANGUAGES)
    .filter(([lang]) => (filterOutAuto ? lang !== 'auto' : true)) // obviously this introduced another pass, which is slow
    .map(([lang, display]) => <Form.Dropdown.Item key={lang} value={lang} title={display} />);
