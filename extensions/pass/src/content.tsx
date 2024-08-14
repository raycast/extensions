import { getPreferenceValues } from '@raycast/api';
import { ActionPanel, Action, List, Icon } from '@raycast/api';
import { useEffect, useState, useMemo } from 'react';
import { decrypt } from './pass';
import { OtpRow } from './otpRow';

interface Row {
  idx: number;
  name: string;
  value: string;
}

function parseRows(content: string): Row[] {
  // Starts with `otpauth://`
  // type can be totp or hotp
  // label betwen type and`?`
  // must contain argumens after `?`
  const otpPattern = /^otpauth:\/\/(totp|hotp)\/([^?]+)\?(.+)$/;

  return content
    .split('\n')
    .filter((s) => !!s)
    .map((s, idx) => {
      if (otpPattern.test(s)) {
        return { idx, name: 'otpauth', value: s };
      } else if (idx === 0) {
        return { idx, name: 'pass', value: s };
      } else {
        const [name, value] = s.split(/:\s?/);
        return { idx: idx, name, value };
      }
    });
}

function ContentRow(row: Row) {
  const { defaultAction } = getPreferenceValues();
  const [show, setShow] = useState<boolean>(false);

  const { toggleTitle, toggleIcon, itemTitle } = useMemo(() => {
    return show
      ? {
          toggleTitle: 'Hide Value',
          toggleIcon: Icon.EyeDisabled,
          itemTitle: row.name + ': ' + row.value,
        }
      : {
          toggleTitle: 'Show Value',
          toggleIcon: Icon.Eye,
          itemTitle: row.name,
        };
  }, [show]);

  return (
    <List.Item
      key={row.idx}
      icon={Icon.Key}
      title={itemTitle}
      actions={
        <ActionPanel>
          {defaultAction === 'copy' ? (
            <>
              <Action.CopyToClipboard content={row.value} />
              <Action.Paste content={row.value} />
            </>
          ) : (
            <>
              <Action.Paste content={row.value} />
              <Action.CopyToClipboard content={row.value} />
            </>
          )}
          <Action
            icon={toggleIcon}
            title={toggleTitle}
            onAction={() => setShow(!show)}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'h' }}
          />
        </ActionPanel>
      }
    />
  );
}

interface ContentProps {
  storepath: string;
  file: string;
}

export default function Content({ storepath, file }: ContentProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const decrypted = await decrypt(file, storepath);
        setRows(parseRows(decrypted));
      } catch (error) {
        console.error('Failed to fetch password content:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [file]);

  return (
    <List isLoading={isLoading}>
      {rows.map((row) =>
        row.name === 'otpauth' ? (
          <OtpRow key={row.idx} file={file} storepath={storepath} />
        ) : (
          <ContentRow key={row.idx} {...row} />
        ),
      )}
    </List>
  );
}
