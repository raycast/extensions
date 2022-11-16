import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  useNavigation,
} from '@raycast/api';

import { getDiffText } from './utils';

interface FormValues {
  original: string;
  changed: string;
}

function Command() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Find Difference"
            icon={Icon.Eye}
            onSubmit={(values: FormValues) => {
              const { original, changed } = values;
              if (original === changed) {
                showToast({
                  title: 'Files are identical',
                });
              } else {
                push(
                  <DiffView
                    original={values.original}
                    changed={values.changed}
                  />,
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Original Text" id="original" />
      <Form.TextArea title="Changed Text" id="changed" />
    </Form>
  );
}

interface DiffProps {
  original: string;
  changed: string;
}

function DiffView(props: DiffProps) {
  const { original, changed } = props;
  const diff = getDiffText(original, changed);
  const markdown = `
  ## Diff

  \`\`\`
${diff}
  \`\`\``;
  return <Detail markdown={markdown} />;
}

export default Command;
