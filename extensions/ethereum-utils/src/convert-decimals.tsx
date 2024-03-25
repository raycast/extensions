import {
  ActionPanel,
  Detail,
  Form,
  showToast,
  useNavigation,
  Action,
  Toast,
} from '@raycast/api';
import { formatUnits, parseUnits } from 'ethers';

interface FormValues {
  input: string;
  inputDecimals: string;
  outputDecimals: string;
}

export default function Command() {
  const { push } = useNavigation();

  function handleSubmit(values: FormValues) {
    const { input, inputDecimals, outputDecimals } = values;

    if (!isInt(input)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid input',
        message: '"Input" should be a number',
      });
      return;
    }
    if (!isDecimal(inputDecimals)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid input',
        message: '"Input decimals" should be a decimal',
      });
      return;
    }
    if (!isDecimal(outputDecimals)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid input',
        message: '"Output decimals" should be a decimals',
      });
      return;
    }

    const inputDecimalsNumber = parseInt(inputDecimals);
    const outputDecimalsNumber = parseInt(outputDecimals);

    try {
      const parsedInput = parseUnits(input, inputDecimalsNumber);
      const output = formatUnits(parsedInput, outputDecimalsNumber);

      push(
        <ConvertionView
          input={input}
          output={output}
          inputDecimals={inputDecimalsNumber}
          outputDecimals={outputDecimalsNumber}
        />,
      );
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to convert',
        message: 'Please make sure that decimals are in the correct order',
      });
    }
  }

  function isInt(value: string): boolean {
    return !isNaN(parseInt(value));
  }

  function isDecimal(value: string): boolean {
    if (!isInt(value)) {
      return false;
    }
    const number = parseInt(value);
    return number >= 0 && number <= 30;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="input" title="Input" />
      <Form.TextField id="inputDecimals" title="Input decimals" />
      <Form.TextField id="outputDecimals" title="Output decimals" />
    </Form>
  );
}

interface ConvertionProps {
  input: string;
  output: string;
  inputDecimals: number;
  outputDecimals: number;
}

function ConvertionView(props: ConvertionProps) {
  const { input, output, inputDecimals, outputDecimals } = props;

  const markdown = `
  # Convertion

  ${input} (${inputDecimals} decimals) = ${output} (${outputDecimals} decimals)
  `;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    />
  );
}
