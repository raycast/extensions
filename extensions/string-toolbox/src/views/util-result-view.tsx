import { ActionPanel, CopyToClipboardAction, PasteAction, Detail } from "@raycast/api";

interface UtilResultViewProps {
  input: string;
  output: string;
}

const UtilResultView = ({ input, output }: UtilResultViewProps) => {
  const markdown = `

## Output

\`\`\`
${output}
\`\`\`

## Input

\`\`\`
${input}
\`\`\`
`;

  const actions = (
    <ActionPanel>
      <CopyToClipboardAction title="Copy output to clipboard" content={output} />
      <PasteAction title="Paste output to frontmost app" content={output} />
    </ActionPanel>
  );

  return <Detail navigationTitle="Result" actions={actions} markdown={markdown} />;
};

export default UtilResultView;
