import { Detail, ActionPanel, Action } from '@raycast/api';
import { ThingsError } from '../api';

type ErrorViewProps = {
  error: Error;
  onRetry?: () => void;
};

type ErrorData = {
  title: string;
  description: string;
  solutions: string[];
  errorType: string;
};

export default function ErrorView({ error, onRetry }: ErrorViewProps) {
  const getErrorData = (error: Error): ErrorData => {
    if (error instanceof ThingsError) {
      switch (error.type) {
        case 'APP_NOT_FOUND':
          return {
            title: 'Application Not Found',
            description: 'The Things app is not running or not installed.',
            solutions: [
              "**Start Things**: Open the Things app and make sure it's running",
              '**Check Installation**: Verify Things is properly installed',
              '**Restart**: Try quitting and restarting both Things and Raycast',
            ],
            errorType: 'Application Not Found',
          };

        case 'PERMISSION_DENIED':
          return {
            title: 'Permission Denied',
            description: "Raycast doesn't have permission to control Things.",
            solutions: [
              'Open **System Settings** → **Privacy & Security** → **Automation**',
              'Find **Raycast** in the list',
              'Make sure **Things** is checked ✅',
            ],
            errorType: 'Permission Denied',
          };

        case 'EXECUTION_ERROR':
          return {
            title: 'Things Communication Error',
            description: 'There was an error communicating with Things.',
            solutions: [
              '**Restart Things**: Quit and restart the Things app',
              '**Wait and Retry**: If Things was just started, wait a moment and try again',
            ],
            errorType: 'Execution Error',
          };

        case 'UNKNOWN_ERROR':
          return {
            title: 'Unknown Error',
            description: 'An unexpected error occurred while trying to communicate with Things.',
            solutions: [
              '**Restart Both Apps**: Quit and restart both Things and Raycast',
              '**Update**: Make sure both Things and Raycast are up to date',
            ],
            errorType: 'Unknown Error',
          };
      }
    }

    return {
      title: 'Error',
      description: 'An error occurred while loading data from Things.',
      solutions: [
        'Make sure Things is running',
        'Check that Raycast has automation permissions',
        'Try restarting both applications',
      ],
      errorType: error.constructor.name,
    };
  };

  const buildMarkdown = (data: ErrorData, error: Error): string => {
    const originalError = error instanceof ThingsError ? error.originalError : error.message;

    return `# ${data.title}

${data.description}

## Solutions

${data.solutions.map((solution, i) => `${i + 1}. ${solution}`).join('\n')}

## Technical Details

- Error Type: \`${data.errorType}\`
- Original Error: \`${originalError || 'N/A'}\``;
  };

  const errorData = getErrorData(error);
  const markdown = buildMarkdown(errorData, error);

  return (
    <Detail
      markdown={markdown}
      actions={
        onRetry ? (
          <ActionPanel>
            <Action title="Try Again" onAction={onRetry} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
