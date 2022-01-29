import {useState} from 'react';
import {
  ActionPanel,
  closeMainWindow,
  copyTextToClipboard,
  Form,
  Icon,
  PasteAction,
  popToRoot,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation,
} from '@raycast/api';
import {generateMeme} from 'api';
import {ImgflipCaptionImageBox as Box} from 'api/types';
import {Meme} from 'types';
import {ImagePreview} from '..';

interface FormValues {
  capitalize: string;
  font: 'arial' | 'impact';
  [text: string]: string;
}

export function GenerateForm({id, name, boxCount}: Meme) {
  const [loading, setLoading] = useState(false);
  const {push} = useNavigation();

  async function onSubmit(values: FormValues) {
    const {font} = values;
    const boxes = boxesFromFormValues(values);

    setLoading(true);
    const results = await generateMeme({id, font, boxes});
    setLoading(false);

    if (results.success) {
      await copyTextToClipboard(results.url);

      showToast(ToastStyle.Success, 'Meme URL copied to clipboard');
      const id = Buffer.from(results.url, 'base64').toString('base64');
      push(
        <ImagePreview
          url={results.url}
          id={id}
          name="Generated meme"
          actions={
            <ActionPanel title="Generated meme">
              <ActionPanel.Item
                title="Close"
                icon={Icon.XmarkCircle}
                onAction={() => {
                  closeMainWindow();
                  popToRoot({clearSearchBar: true});
                }}
              />
              <PasteAction
                content={results.url}
                shortcut={{modifiers: ['cmd'], key: 'p'}}
                onPaste={() => {
                  popToRoot({clearSearchBar: true});
                }}
              />
            </ActionPanel>
          }
        />,
      );
    } else {
      showToast(ToastStyle.Failure, 'Something went wrong', results.message);
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle={name}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Generate" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {[...Array(boxCount).keys()].map((index) => (
        <Form.TextField
          key={`text_${index}`}
          id={`text[${index}]`}
          title={`${getWordFromNumber(index)} text box`}
          placeholder="Optional"
        />
      ))}

      <Form.Checkbox
        id="capitalize"
        title="Capitalize text"
        label=""
        defaultValue={true}
      />

      <Form.Dropdown id="font" title="Font" defaultValue="impact">
        <Form.Dropdown.Item value="impact" title="Impact" />
        <Form.Dropdown.Item value="arial" title="Arial" />
      </Form.Dropdown>
    </Form>
  );
}

// Need to parse array of text to pass as "boxes"
//
// {
//   text[0]: "First string",
//   text[1]: "Second string",
// }
function boxesFromFormValues(values: FormValues): Box[] {
  const {capitalize} = values;
  return Object.keys(values).reduce<Box[]>((boxes, id) => {
    const matches = id.match(/text\[(.)\]/);
    if (!matches) return boxes;
    boxes[parseInt(matches[1])] = {
      text: capitalize ? values[id].toUpperCase() : values[id],
    };
    return boxes;
  }, []);
}

const WORD_NUMBERS = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

function getWordFromNumber(number: number) {
  return WORD_NUMBERS[number] || 'Another';
}
