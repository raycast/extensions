import { Action, ActionPanel, Detail, openExtensionPreferences } from '@raycast/api';
import { ArchiveError } from '../archive';

const EXPORT_STEPS = [
  'Open **Screens**',
  'Go to **Settings → Archives → Export…**',
  'Save the `.screens` file somewhere it will stay put, such as your Documents folder',
  "Select that file in this extension's preferences",
];

type ArchiveErrorViewProps = {
  error: Error;
  onRetry?: () => void;
};

type ErrorGuidance = {
  title: string;
  description: string;
  solutions: string[];
};

export default function ArchiveErrorView({ error, onRetry }: ArchiveErrorViewProps) {
  const guidance = getGuidance(error);

  return (
    <Detail
      navigationTitle={guidance.title}
      markdown={buildMarkdown(guidance, error)}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          {onRetry ? <Action title="Try Again" onAction={onRetry} /> : null}
        </ActionPanel>
      }
    />
  );
}

function getGuidance(error: Error): ErrorGuidance {
  if (error instanceof ArchiveError) {
    switch (error.type) {
      case 'FILE_NOT_FOUND':
        return {
          title: 'Archive Not Found',
          description: 'The archive selected in preferences is no longer at that path.',
          solutions: [
            'If you moved or renamed the file, select it again in preferences',
            'If you deleted it, export a fresh one:',
            ...EXPORT_STEPS,
          ],
        };

      case 'UNREADABLE':
        return {
          title: 'Archive Unreadable',
          description: 'The archive exists but could not be read.',
          solutions: [
            '**Check permissions**: make sure the file is readable by your user account',
            '**Move it out of a protected folder**: files in iCloud Drive may not be downloaded locally',
            '**Re-export**: export a fresh archive and select it in preferences',
          ],
        };

      case 'INVALID_JSON':
        return {
          title: 'Archive Is Not Valid',
          description: 'The selected file is not readable as a Screens archive.',
          solutions: [
            '**Check the file**: make sure you selected the `.screens` file, not a folder or a backup',
            '**Re-export**: a truncated export can leave an unreadable file. Export again:',
            ...EXPORT_STEPS,
          ],
        };

      case 'NOT_AN_ARCHIVE':
        return {
          title: 'No Connections in Archive',
          description: 'The file parsed, but it has no list of connections in it.',
          solutions: [
            '**Check the file**: this looks like valid JSON but not a Screens archive',
            '**Re-export**: export a fresh archive from Screens:',
            ...EXPORT_STEPS,
          ],
        };
    }
  }

  return {
    title: 'Error',
    description: 'An error occurred while reading the Screens archive.',
    solutions: ['Check that the archive selected in preferences still exists', 'Export a fresh archive from Screens'],
  };
}

function buildMarkdown(guidance: ErrorGuidance, error: Error): string {
  const path = error instanceof ArchiveError ? error.path : undefined;
  const original = error instanceof ArchiveError ? error.originalError : error.message;

  return `# ${guidance.title}

${guidance.description}

## Solutions

${guidance.solutions.map((solution, index) => `${index + 1}. ${solution}`).join('\n')}

## Technical Details

- Error Type: \`${error instanceof ArchiveError ? error.type : error.constructor.name}\`${path ? `\n- Path: \`${path}\`` : ''}
- Original Error: \`${original || 'N/A'}\``;
}
