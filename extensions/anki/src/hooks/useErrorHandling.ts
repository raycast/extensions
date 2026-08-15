import { showToast, Toast, open } from '@raycast/api';
import { AxiosError } from 'axios';
import { useCallback, useMemo } from 'react';
import { AnkiError } from '../error/AnkiError';

function useErrorHandling() {
  const handleError = useCallback(async (error: unknown) => {
    if (error instanceof AxiosError && error.code === 'ECONNREFUSED') {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Connection to Anki failed',
        message: 'Confirm Anki is on & anki-connect is added',
        primaryAction: {
          title: 'Install Anki',
          onAction: (toast: Toast) => {
            open('https://apps.ankiweb.net/');
            toast.hide();
          },
        },
        secondaryAction: {
          title: 'Install anki-connect',
          onAction: (toast: Toast) => {
            open('https://ankiweb.net/shared/info/2055492159');
            toast.hide();
          },
        },
      });
    } else if (error instanceof AnkiError) {
      await showToast({
        style: Toast.Style.Failure,
        title: error.name,
        message: error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Unexpected error occured',
        message: 'Please report this bug',
        primaryAction: {
          title: 'Report a bug',
          onAction: (toast: Toast) => {
            open('https://github.com/anton-suprun/anki-raycast/issues/new');
            toast.hide();
          },
        },
      });
    }
  }, []);

  const errorMarkdown = useMemo(() => {
    return `# Anki Connection Error

It seems there's an issue connecting to Anki. This could be due to one of the following reasons:

1. **Anki is not running**
   - Ensure the Anki application is open and running in the background

2. **AnkiConnect is not installed or activated**
   - Go to Tools > Add-ons in Anki to verify that anki-connect add-on is installed in Anki
   - If not installed, get it from AnkiWeb: [AnkiConnect](https://ankiweb.net/shared/info/2055492159)
   - Make sure it's enabled in the add-ons list

3. **AnkiConnect is not running on the correct port**
   - AnkiConnect should be running on port 8765 by default
   - Check AnkiConnect settings in Anki:
     1. Go to Tools > Add-ons
     2. Select AnkiConnect
     3. Click "Config"
     4. Verify the "webBindPort" is set to 8765
     5. (Optional): If you do not want to use port 8765, change it to your preferred port number in the extension configuration and the add-on

## Additional Troubleshooting Steps

1. Restart Anki
2. Ensure Anki is updated to latest version
3. Ensure AnkiConnect is udpated to latest version
4. Restart your computer

If the issue persists, please report it as a bug in the [GitHub repository](https://github.com/anton-suprun/anki-raycast/issues/new).`;
  }, []);

  return {
    handleError,
    errorMarkdown,
  };
}

export default useErrorHandling;
