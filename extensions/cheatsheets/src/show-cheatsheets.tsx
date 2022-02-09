import { ActionPanel, Detail, List, ListItem, PushAction } from '@raycast/api';
import { useEffect, useState } from 'react';

import Service from './service';
import { getSheets, stripFrontmatter, stripTemplateTags, formatTables } from './utils';

function Action() {
  const [sheets, setSheets] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchList() {
      const files = await Service.listFiles();
      const sheets = getSheets(files);
      setSheets(sheets);
      setLoading(false);
    }

    fetchList();
  }, []);

  return (
    <List isLoading={isLoading}>
      {sheets.map((sheet) => (
        <ListItem
          actions={
            <ActionPanel>
              <PushAction title="Open Cheatsheet" target={<SheetView slug={sheet} />} />
            </ActionPanel>
          }
          key={sheet}
          title={sheet}
        />
      ))}
    </List>
  );
}

interface SheetProps {
  slug: string;
}

function SheetView(props: SheetProps) {
  const [sheet, setSheet] = useState('');
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSheet() {
      const sheetMarkdown = await Service.getSheet(props.slug);
      const sheet = formatTables(stripTemplateTags(stripFrontmatter(sheetMarkdown)));

      setSheet(sheet);
      setLoading(false);
    }

    fetchSheet();
  }, []);

  return <Detail isLoading={isLoading} markdown={sheet} />;
}

export default Action;
