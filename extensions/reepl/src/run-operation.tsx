import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';
import { useMemo, useState } from 'react';
import { executeOperation, parseJsonObject } from './api';
import { OPERATION_BY_ID, REEPL_OPERATIONS, ReeplOperation } from './operations';

type FormValues = {
  operationId: string;
  pathParamsJson: string;
  queryJson: string;
  bodyJson: string;
};

function emptyObjectFor(parameters?: { name: string }[]): string {
  if (!parameters?.length) return '{}';
  return JSON.stringify(Object.fromEntries(parameters.map(({ name }) => [name, ''])), null, 2);
}

function exampleJson(example: unknown): string {
  return example === undefined ? '{}' : JSON.stringify(example, null, 2);
}

function responseMarkdown(result: Awaited<ReturnType<typeof executeOperation>>): string {
  return [
    `# ${result.operation}`,
    '',
    `**${result.method} ${result.path}**`,
    '',
    `Status: **${result.status}**`,
    '',
    '```json',
    JSON.stringify(result.data, null, 2),
    '```',
  ].join('\n');
}

function ResponseDetail({
  result,
}: {
  result: Awaited<ReturnType<typeof executeOperation>>;
}) {
  const response = JSON.stringify(result.data, null, 2);

  return (
    <Detail
      markdown={responseMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={response} />
          <Action.CopyToClipboard title="Copy Request URL" content={result.url} />
          <Action.OpenInBrowser title="Open API Documentation" url="https://developers.reepl.io" />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.RunOperation>();
  const { push } = useNavigation();
  const [operationId, setOperationId] = useState<string>(REEPL_OPERATIONS[0].id);
  const selectedOperation = useMemo<ReeplOperation>(
    () => OPERATION_BY_ID[operationId] ?? REEPL_OPERATIONS[0],
    [operationId],
  );

  const submit = async (values: FormValues) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: 'Running Reepl request' });

    try {
      const operation = OPERATION_BY_ID[values.operationId];
      const pathParams = parseJsonObject(values.pathParamsJson, 'Path parameters');
      const query = parseJsonObject(values.queryJson, 'Query parameters');
      const body = parseJsonObject(values.bodyJson, 'Request body');
      const result = await executeOperation({ operation, apiKey: preferences.apiKey, pathParams, query, body });

      const response = JSON.stringify(result.data, null, 2);
      await Clipboard.copy(response);
      toast.style = Toast.Style.Success;
      toast.title = `Request succeeded (${result.status})`;
      toast.message = 'Response copied to the clipboard';
      push(<ResponseDetail result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = 'Reepl request failed';
      toast.message = error instanceof Error ? error.message : 'Unknown error';
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Operation" onSubmit={submit} />
          <Action.OpenInBrowser title="Open Reepl API Keys" url="https://app.reepl.io/settings/api-keys" />
          <Action.CopyToClipboard
            title="Copy Operation Path"
            content={`${selectedOperation.method} ${selectedOperation.path}`}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="operationId" title="Operation" value={operationId} onChange={setOperationId}>
        {Array.from(new Set(REEPL_OPERATIONS.map((operation) => operation.group))).map((group) => (
          <Form.Dropdown.Section key={group} title={group}>
            {REEPL_OPERATIONS.filter((operation) => operation.group === group).map((operation) => (
              <Form.Dropdown.Item
                key={operation.id}
                value={operation.id}
                title={`${operation.name} (${operation.method})`}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Description
        text={`${selectedOperation.method} ${selectedOperation.path}\n${selectedOperation.description}\nRequired scope: ${selectedOperation.scopes.join(', ')}`}
      />
      <Form.TextArea
        key={`${operationId}-path`}
        id="pathParamsJson"
        title="Path Parameters JSON"
        placeholder={emptyObjectFor(selectedOperation.pathParams)}
        defaultValue={emptyObjectFor(selectedOperation.pathParams)}
      />
      <Form.TextArea
        key={`${operationId}-query`}
        id="queryJson"
        title="Query Parameters JSON"
        placeholder={emptyObjectFor(selectedOperation.query)}
        defaultValue={emptyObjectFor(selectedOperation.query)}
      />
      <Form.TextArea
        key={`${operationId}-body`}
        id="bodyJson"
        title="Request Body JSON"
        placeholder={exampleJson(selectedOperation.bodyExample)}
        defaultValue={exampleJson(selectedOperation.bodyExample)}
      />
    </Form>
  );
}
