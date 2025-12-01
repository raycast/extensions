import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  popToRoot,
  getFrontmostApplication,
} from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import { useState } from 'react';
import { ContextItem } from './types';
import { randomUUID } from 'crypto';

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function getDeepContext(
    bundleId: string,
    appName: string,
  ): Promise<{ url?: string; tabTitle?: string }> {
    try {
      // Chrome-based Browsers
      if (
        [
          'com.google.Chrome',
          'com.brave.Browser',
          'com.microsoft.edgemac',
          'company.thebrowser.Browser', // Arc
          'com.vivaldi.Vivaldi',
        ].includes(bundleId)
      ) {
        const script = `
          tell application id "${bundleId}"
            if (count of windows) > 0 then
              return {URL, title} of active tab of front window
            end if
          end tell
        `;
        const result = await runAppleScript(script);
        const [url, title] = result.split(', ').map((s) => s.trim());
        return { url, tabTitle: title };
      }

      // Safari
      if (bundleId === 'com.apple.Safari') {
        const script = `
          tell application "Safari"
            if (count of windows) > 0 then
              return {URL, name} of current tab of front window
            end if
          end tell
        `;
        const result = await runAppleScript(script);
        const [url, title] = result.split(', ').map((s) => s.trim());
        return { url, tabTitle: title };
      }

      // Firefox / Zen Browser (UI Scripting)
      if (['org.mozilla.firefox', 'app.zen-browser.zen'].includes(bundleId)) {
        // Attempt to get URL via Accessibility API (requires permission)
        // Fallback to just Window Title
        const script = `
          tell application "System Events"
            tell process "${appName}"
              set currentTitle to name of front window
              set currentURL to ""
              try
                -- Standard Firefox UI structure
                set currentURL to value of UI element 1 of combo box 1 of toolbar "Navigation" of first group of front window
              end try
              return currentURL & ":::" & currentTitle
            end tell
          end tell
        `;
        const result = await runAppleScript(script);
        const [url, title] = result.split(':::').map((s) => s.trim());
        return { url: url || undefined, tabTitle: title };
      }

      // iTerm2
      if (bundleId === 'com.googlecode.iterm2') {
        const script = `
          tell application "iTerm"
            if (count of windows) > 0 then
              return name of current session of current window
            end if
          end tell
        `;
        const result = await runAppleScript(script);
        return { tabTitle: result.trim() };
      }
    } catch (e) {
      console.error('Failed to get deep context', e);
    }
    return {};
  }

  async function handleSubmit(values: { content: string }) {
    if (!values.content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Content cannot be empty',
      });
      return;
    }

    setIsLoading(true);
    try {
      const json = await LocalStorage.getItem<string>('items');
      const items: ContextItem[] = json ? JSON.parse(json) : [];

      let appBundleId: string | undefined;
      let appName: string | undefined;
      let deepContext = {};

      try {
        const frontmostApp = await getFrontmostApplication();
        if (frontmostApp) {
          appBundleId = frontmostApp.bundleId;
          appName = frontmostApp.name;
          if (appBundleId) {
            deepContext = await getDeepContext(appBundleId, appName);
          }
        }
      } catch (e) {
        console.error('Failed to get frontmost app', e);
      }

      const newItem: ContextItem = {
        id: randomUUID(),
        content: values.content,
        timestamp: Date.now(),
        appBundleId,
        appName,
        ...deepContext,
      };

      // Append to end (Stack logic: last in is top)
      items.push(newItem);

      await LocalStorage.setItem('items', JSON.stringify(items));

      showToast({ style: Toast.Style.Success, title: 'Added to Stack' });
      popToRoot();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: 'Failed to save item' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Context"
        placeholder="What are you working on?"
        enableMarkdown
        autoFocus
      />
    </Form>
  );
}
