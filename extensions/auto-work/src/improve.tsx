import { ActionPanel, Detail, Action } from '@raycast/api';
import { useEffect, useState } from 'react';
import { ImproveWrite } from './type';
import { useQueryText } from './hooks/useQueryText';
import { SUMMARY_MODEL } from './hooks/useModel';
import { getSelectText } from './utils';

export default function Summary(props: { improveWrite?: ImproveWrite }) {
  const [selectedText, setSelectedText] = useState<string>('');
  const chats = useQueryText<any>(props.improveWrite ? props.improveWrite.chats : {});
  const { isLoading, data } = chats;
  const [markdown, setMarkdown] = useState<string>('');

  useEffect(() => {
    const setSelectText = function () {
      getSelectText()
        .then((selectedText) => {
          if (selectedText) {
            setSelectedText(selectedText.trim());
          }
        })
        .catch((err) => {
          console.log(err);
        });
    };
    setSelectText();
  }, []);

  useEffect(() => {
    const querySelectedText = async () => {
      if (selectedText) {
        await chats.ask(selectedText, SUMMARY_MODEL, 'improve');
      }
    };
    querySelectedText();
  }, [selectedText]);

  useEffect(() => {
    if (selectedText && data && data.answer) {
      const markdown = `
### Rephrase Text

${data.answer}


### Your Text

${selectedText}`;
      setMarkdown(markdown);
    }
  }, [data]);

  return selectedText ? (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={data.answer} />
        </ActionPanel>
      }
    />
  ) : (
    <Detail markdown="You can select or copy text to improve write" />
  );
}
