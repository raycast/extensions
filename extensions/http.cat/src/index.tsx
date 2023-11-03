import { ActionPanel, Action, Icon, List, Color } from '@raycast/api';
import React from 'react';
import http from 'http';

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
                  <Action.CopyToClipboard content={code.code} />
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
