import { ActionPanel, Action, Icon, List, Color, showToast, Clipboard, Toast, showHUD } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';
import fetch from 'node-fetch';
import http from 'http';
import path from 'path';
import tempy, { FileOptions } from 'tempy';

type Code = {
  code: string;
  description?: string;
};

export default function Command() {
  const codeGroups = Object.entries(http.STATUS_CODES).reduce(
    (groups: { [firstDigit: string]: Code[] }, [code, description]) => {
      const group = groups[code[0]] || [];
      group.push({ code, description });

      groups[code[0]] = group;

      return groups;
    },
    {},
  );

  const copyFile = (url: string, fileName: string) => {
    showToast({
      style: Toast.Style.Animated,
      title: 'Copying...',
    })
      .then(async (toast) => {
        return await copyFileToClipboard(url, fileName).then((file) => {
          toast.hide();
          showHUD(`Copied "${file}" to clipboard`);
        });
      })
      .catch((e: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: 'Error, please try again',
          message: e?.message,
          primaryAction: {
            title: 'Copy Error Message',
            onAction: (toast) => {
              Clipboard.copy(toast.message ?? '');
            },
            shortcut: { modifiers: ['cmd'], key: 'c' },
          },
        });
      });
  };

  const copyFileToClipboard = async (url: string, name: string) => {
    const response = await fetch(url);

    if (response.status !== 200) {
      throw new Error(`File download failed. Server responded with ${response.status} status.`);
    }

    if (response.body === null) {
      throw new Error('Unable to read image response.');
    }

    const tempyOpt: FileOptions = { name };
    let file: string;

    try {
      file = await tempy.write(await response.body, tempyOpt);
    } catch (e) {
      const error = e as Error;

      throw new Error(`Failed to download image: "${error.message}".`);
    }

    try {
      await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
    } catch (e) {
      const error = e as Error;

      throw new Error(`Failed to copy image: "${error.message}"`);
    }

    return path.basename(file);
  };

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by code or description..." isShowingDetail>
      {Object.entries(codeGroups).map(([firstDigit, codes]) => (
        <List.Section key={firstDigit} title={`${firstDigit}xx`} subtitle={getCodeGroupDescription(firstDigit)}>
          {codes.map((code) => (
            <List.Item
              key={code.code}
              title={code.code}
              subtitle={code.description}
              keywords={[code.description || '']} // make subtitle searchable
              icon={{
                source: Icon.Dot,
                tintColor: statusCodeToColor(code.code),
              }}
              detail={<List.Item.Detail markdown={`![Illustration](https://http.cat/${code.code}.jpg)`} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getCodeDocsUrl(code.code)} />
                  <Action.CopyToClipboard title="Copy Code" content={code.code} />
                  <Action
                    icon={Icon.Clipboard}
                    key="copyFile"
                    title="Copy Image"
                    onAction={() => {
                      const fileName = `${code.code}.jpg`;

                      copyFile(`https://http.cat/${fileName}`, fileName);
                    }}
                    shortcut={{ modifiers: ['cmd', 'opt'], key: 'c' }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function statusCodeToColor(status: string): Color {
  return (
    {
      1: Color.Blue,
      2: Color.Green,
      3: Color.Yellow,
      4: Color.Orange,
      5: Color.Red,
    }[status[0]] || Color.Magenta
  );
}

function getCodeGroupDescription(firstDigit: string): string {
  return (
    {
      1: 'Informational response - the request was received, continuing process',
      2: 'Successful - the request was successfully received, understood, and accepted',
      3: 'Redirection - further action needs to be taken in order to complete the request',
      4: 'Client error - the request contains bad syntax or cannot be fulfilled',
      5: 'Server error - the server failed to fulfil an apparently valid request',
    }[firstDigit] || ''
  );
}

function getCodeDocsUrl(code: string): string {
  const codesWithoutDocs = ['305', '509'];

  if (codesWithoutDocs.includes(code)) {
    return 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status';
  }

  return `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`;
}
