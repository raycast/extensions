import { JsonFragment } from 'ethers';
import {
  ActionPanel,
  Detail,
  Form,
  showToast,
  useNavigation,
  Action,
  Toast,
} from '@raycast/api';
import { Coder, Constructor, Event, FunctionData } from 'abi-coder';
import { useState } from 'react';
import { isAbi, isData, isEventTopic, normalizeHex } from './utils';

type Type = 'constructor' | 'function' | 'event';

interface FormValues {
  abi: string;
  type: Type;
  data: string;
  topic0?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
}

export default function Command() {
  const { push } = useNavigation();

  const [abiString, setAbiString] = useState<string>('');
  const [type, setType] = useState<string>('');

  function handleAbiStringUpdate(value: string) {
    setAbiString(value);
  }

  function handleSubmit(values: FormValues) {
    const {
      abi: abiString,
      type,
      data,
      topic0,
      topic1,
      topic2,
      topic3,
    } = values;
    const topics = [topic0, topic1, topic2, topic3];
    if (!isAbi(abiString)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid ABI',
      });
      return;
    }
    const abi: JsonFragment[] = JSON.parse(abiString);
    const dataHex = normalizeHex(data);
    if (!isData(dataHex)) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid data',
      });
      return;
    }
    if (type === 'event') {
      const validTopic0 = !!topic0 && isEventTopic(topic0);
      const validTopics = topics.every(
        (topic) => !!topic && (topic.length === 0 || isEventTopic(topic)),
      );
      if (!validTopic0 || !validTopics) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Invalid event topics',
        });
        return;
      }
    }
    const coder = new Coder(abi);
    if (type === 'constructor') {
      try {
        const constructor = coder.decodeConstructor(data);
        push(<DecodedDataView constr={constructor} />);
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: 'Conversion failed',
        });
      }
      return;
    }
    if (type === 'function') {
      try {
        const func = coder.decodeFunction(data);
        console.log(func);
        push(<DecodedDataView func={func} />);
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: 'Conversion failed',
        });
      }
      return;
    }
    if (type === 'event') {
      try {
        const allTopics = topics.filter((topic): topic is string => !!topic);
        const event = coder.decodeEvent(allTopics, data);
        push(<DecodedDataView event={event} />);
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: 'Conversion failed',
        });
      }
      return;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="abi"
        title="ABI"
        value={abiString}
        onChange={handleAbiStringUpdate}
      />
      <Form.Dropdown id="type" title="Type" value={type} onChange={setType}>
        <Form.Dropdown.Item title="Constructor" value="constructor" />
        <Form.Dropdown.Item title="Function" value="function" />
        <Form.Dropdown.Item title="Event" value="event" />
      </Form.Dropdown>
      <Form.TextField id="data" title="Data" />
      {type === 'event' ? (
        <>
          <Form.TextField id="topic0" title="Topic 0" />
          <Form.TextField id="topic1" title="Topic 1 (optional)" />
          <Form.TextField id="topic2" title="Topic 2 (optional)" />
          <Form.TextField id="topic3" title="Topic 3 (optional)" />
        </>
      ) : null}
    </Form>
  );
}

interface DecodedEventProps {
  event: Event;
}

interface DecodedConstructorProps {
  constr: Constructor;
}

interface DecodedFunctionProps {
  func: FunctionData;
}

type DecodedDataProps =
  | DecodedEventProps
  | DecodedConstructorProps
  | DecodedFunctionProps;

function DecodedDataView(props: DecodedDataProps) {
  const titleText =
    'event' in props
      ? `Event "${props.event.name}"`
      : 'constr' in props
        ? `Constructor`
        : `Function "${props.func.name}"`;
  const inputs =
    'event' in props
      ? props.event.inputs
      : 'constr' in props
        ? props.constr.inputs
        : props.func.inputs;
  const values =
    'event' in props
      ? props.event.values
      : 'constr' in props
        ? props.constr.values
        : props.func.values;
  const params = inputs
    .map((input, index) => {
      const value = values[input.name] || values[index];
      return `${input.name} (${input.type}): ${value}`;
    })
    .join('\n\n');
  const markdown = `
  # ${titleText}

  ${params}
  `;
  return <Detail markdown={markdown} />;
}
