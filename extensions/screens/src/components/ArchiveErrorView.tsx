import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api';
import { ArchiveError, ArchiveErrorType } from '../archive';

const PROBLEMS: Record<ArchiveErrorType, { title: string; description: string }> = {
  FILE_NOT_FOUND: {
    title: 'Archive Not Found',
    description: 'The file is no longer at that path.',
  },
  UNREADABLE: {
    title: 'Archive Unreadable',
    description:
      'The file is there but could not be read. One kept in iCloud Drive has to be downloaded to this Mac first.',
  },
  INVALID_JSON: {
    title: 'Not a Screens Archive',
    description: 'The file could not be read as JSON. An export interrupted partway through leaves it that way.',
  },
  NOT_AN_ARCHIVE: {
    title: 'No Connections in Archive',
    description: 'The file is valid JSON, but holds no connections.',
  },
};

const UNKNOWN = { title: 'Could Not Read the Archive', description: 'Something went wrong reading the file.' };

export default function ArchiveErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { pop } = useNavigation();
  const problem = error instanceof ArchiveError ? PROBLEMS[error.type] : UNKNOWN;
  const detail = error instanceof ArchiveError ? error.originalError : error.message;

  return (
    <Detail
      navigationTitle={problem.title}
      markdown={`# ${problem.title}

${problem.description} Choose a different file, or export a fresh archive from Screens:

1. Open **Screens**
2. Go to **Settings → Archives → Export…**
3. Save the \`.screens\` file

${detail ? `---\n\n\`${detail}\`` : ''}`}
      actions={
        <ActionPanel>
          <Action title="Choose a Different Archive" icon={Icon.Finder} onAction={pop} />
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
