import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  Form,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation,
} from '@raycast/api';
import Service from './service';
import { isEventTopic, normalizeHex } from './utils';

interface FormValues {
  hash: string;
}

const service = new Service();

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const { hash } = values;
    const topicHash = normalizeHex(hash);
    const isValid = isEventTopic(topicHash);
    if (!isValid) {
      showToast(ToastStyle.Failure, 'Invalid topic hash');
      return;
    }
    const event = await service.getEvent(topicHash);
    if (!event) {
      showToast(ToastStyle.Failure, 'Topic not found');
      return;
    }
    push(<FunctionView event={event} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="hash" title="Topic Hash" />
    </Form>
  );
}

interface FunctionProps {
  event: string;
}

function FunctionView(props: FunctionProps) {
  const { event } = props;

  const markdown = `
  # Event

  ${event}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <CopyToClipboardAction content={event} />
        </ActionPanel>
      }
    />
  );
}
