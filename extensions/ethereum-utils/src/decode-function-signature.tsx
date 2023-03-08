import {
  ActionPanel,
  Detail,
  Form,
  showToast,
  useNavigation,
  Action,
  Toast,
} from '@raycast/api';
import Service from './service';
import { isSignature, normalizeHex } from './utils';

interface FormValues {
  hash: string;
}

const service = new Service();

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const { hash } = values;
    const signatureHash = normalizeHex(hash);
    const isValid = isSignature(signatureHash);
    if (!isValid) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid signature hash',
      });
      return;
    }
    const signature = await service.getFunctionSignature(signatureHash);
    if (!signature) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Signature not found',
      });
      return;
    }
    push(<FunctionView signature={signature} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="hash" title="Signature Hash" />
    </Form>
  );
}

interface FunctionProps {
  signature: string;
}

function FunctionView(props: FunctionProps) {
  const { signature } = props;

  const markdown = `
  # Function

  ${signature}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={signature} />
        </ActionPanel>
      }
    />
  );
}
