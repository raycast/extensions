import { useState } from 'react';
import { Form, ActionPanel, Action, showToast, Clipboard, Toast, showHUD } from '@raycast/api';
import { Separator } from './utils/separator';
import { QuoteStyle } from './utils/quote-style';

interface FormData {
  input: string;
  quoteStyle: QuoteStyle;
  clipboard: boolean;
  brackeys: boolean;
}

export default function Command() {
  const [output, setOutput] = useState('');
  const [separator, setSeparator] = useState<Separator>(Separator.LINE_BREAK);

  async function handleSubmit(formData: FormData) {
    const { input, quoteStyle, brackeys, clipboard } = formData;
    const quote = quoteStyle === QuoteStyle.SINGLE ? `'` : `"`;

    try {
      const parsedInput = input
        .trim()
        .split(separator)
        .filter(i => i.trim().length)
        .map(i => `${quote}${i}${quote}`)
        .join(', ');

      if (parsedInput.length <= 0) {
        showToast({ title: 'Missing input', style: Toast.Style.Failure });
        return;
      }

      const output = brackeys ? `[${parsedInput}]` : parsedInput;

      setOutput(output);

      if (clipboard) {
        await Clipboard.copy(output);
        await showHUD('📋 Output copied to clipboard');
        return;
      }

      showToast({
        title: 'Input formated',
        primaryAction: {
          title: 'Copy to clipboard',
          onAction: async toast => {
            await Clipboard.copy(output);
            toast.hide();
          },
        },
      });
    } catch (err) {
      showToast({ title: 'Something went wrong', style: Toast.Style.Failure });
    }
  }

  const getSeparatorLabel = (s: Separator) => {
    return Object.keys(Separator)
      [Object.values(Separator).findIndex(e => e === s)]?.replaceAll('_', ' ')
      ?.toLowerCase();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder={`Values separated by ${getSeparatorLabel(separator)}`} />
      <Form.TextArea id="output" title="Output" placeholder="Formated array" value={output} onChange={() => {}} />

      <Form.Dropdown id="quoteStyle" title="Quote" storeValue>
        <Form.Dropdown.Item value={QuoteStyle.SINGLE} title="Single" />
        <Form.Dropdown.Item value={QuoteStyle.DOUBLE} title="Double" />
      </Form.Dropdown>

      <Form.Dropdown id="separator" title="Separator" onChange={e => setSeparator(e as Separator)} storeValue>
        <Form.Dropdown.Item value={Separator.LINE_BREAK} title="Line break" />
        <Form.Dropdown.Item value={Separator.COMMA} title="Comma" />
        <Form.Dropdown.Item value={Separator.SEMICOLON} title="Semicolon" />
        <Form.Dropdown.Item value={Separator.ESPACE} title="Espace" />
      </Form.Dropdown>

      <Form.Checkbox id="clipboard" label="Copy to clipboard" storeValue />
      <Form.Checkbox id="brackeys" label="Wrap with brackeys" storeValue />
    </Form>
  );
}
