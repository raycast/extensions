import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

// Setup requires explicit commands; merely opening Raycast never installs a login service or reads files.
const INSTALL_COMMAND =
  "npm install && npm run build:native && npm run download:models && npm run install:service";
const markdown = `# Local Content Search

EmbeddingGemma 2 runs on your Mac. No DigUp app, Google API key, or cloud inference is used.

## First setup

1. In Terminal, open this project's repository folder and run:

\`\`\`sh
${INSTALL_COMMAND}
\`\`\`

2. Run \`npm run dev\` to register the Raycast extension.
3. Open **Manage Content Index → Choose Folders and Limits**. Start with one small folder.
4. Wait for searchable files, then open **Search File Contents**.

## Background indexing

The independent login service watches only the folders you select. It continues with Raycast closed. Pause/resume and resource limits are in Manage Content Index. Low Power Mode and memory pressure suspend indexing.

The first model download is about 865 MB. After setup, indexing and searching work offline. File contents and vectors are stored under \`~/Library/Application Support/LocalSearch\`; the index is private to your user but not encrypted separately from your disk.

## Remove the login service

Run \`npm run uninstall:service\` from the repository. It stops and unregisters this service while preserving your model, index, and settings.

## Current boundaries

Queries incur native model startup, typically a fraction of a second on Apple Silicon; actual search latency depends on your index. PDF pages and media times are shown in results, but Open File opens the original file rather than seeking to the match. Code projects are skipped except screenshots; dedicated code indexing is not enabled.
`;

export default function Setup() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Installation Command"
            content={INSTALL_COMMAND}
          />
          <Action.CopyToClipboard
            title="Copy Raycast Development Command"
            content="npm run dev"
            icon={Icon.Code}
          />
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content="npm run uninstall:service"
          />
        </ActionPanel>
      }
    />
  );
}
