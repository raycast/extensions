import { showToast, Toast } from '@raycast/api';
import { useCallback } from 'react';
import { describeError, errorMarkdown } from '../error/presentation';

function useErrorHandling(error?: unknown) {
  const handleError = useCallback(async (caughtError: unknown) => {
    const { title, message } = describeError(caughtError);
    await showToast({ style: Toast.Style.Failure, title, message });
  }, []);

  return { handleError, errorMarkdown: errorMarkdown(error) };
}

export default useErrorHandling;
