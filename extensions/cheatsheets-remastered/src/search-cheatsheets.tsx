import React from 'react';
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from '@raycast/api';
import { useState, useEffect } from 'react';
import Service, { CustomCheatsheet } from './service';
import type { File as ServiceFile } from './service';

interface SearchCheatsheetsProps {
  arguments?: {
    query?: string;
    type?: 'custom' | 'default' | 'all';
  };
}

export default function SearchCheatsheets({
  arguments: args,
}: SearchCheatsheetsProps) {
  const [searchQuery, setSearchQuery] = useState(args?.query || '');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'default'>(
    args?.type === 'custom'
      ? 'custom'
      : args?.type === 'default'
        ? 'default'
        : 'all',
  );
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [defaultSheets, setDefaultSheets] = useState<string[]>([]);
  const [contentResults, setContentResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // no-op

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [custom, defaultSheetsData] = await Promise.all([
        Service.getCustomCheatsheets(),
        Service.listFiles(),
      ]);

      setCustomSheets(custom);
      if (defaultSheetsData.length > 0) {
        const sheets = getSheets(defaultSheetsData);
        setDefaultSheets(sheets);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'Failed to load cheatsheets',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function run() {
      const q = searchQuery.trim();
      if (!q) {
        setContentResults([]);
        return;
      }
      const res = await Service.searchDefaultContent(q);
      if (mounted) setContentResults(res);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  // Helper function to get sheets from files
  function getSheets(files: ServiceFile[]): string[] {
    return files
      .filter((file) => {
        const isDir = file.type === 'tree';
        const isMarkdown = file.path.endsWith('.md');
        const adminFiles = ['CONTRIBUTING', 'README', 'index', 'index@2016'];
        const isAdminFile = adminFiles.some((adminFile) =>
          file.path.startsWith(adminFile),
        );
        const inUnderscoreDir = /(^|\/)_[^/]+/.test(file.path);
        return !isDir && isMarkdown && !isAdminFile && !inUnderscoreDir;
      })
      .map((file) => file.path.replace('.md', ''));
  }

  const filteredCustomSheets = customSheets
    .filter(() => filterType === 'all' || filterType === 'custom')
    .filter(
      (sheet) =>
        searchQuery === '' ||
        sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        sheet.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filteredDefaultSheets = defaultSheets
    .filter(() => filterType === 'all' || filterType === 'default')
    .filter(
      (sheet) =>
        searchQuery === '' ||
        Service.defaultMatchesQuery(sheet, searchQuery) ||
        contentResults.includes(sheet),
    );

  const totalResults =
    filteredCustomSheets.length + filteredDefaultSheets.length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search all cheatsheets..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={filterType}
          onChange={(value) =>
            setFilterType(value as 'all' | 'custom' | 'default')
          }
        >
          <List.Dropdown.Item title="All Types" value="all" icon={Icon.List} />
          <List.Dropdown.Item
            title="Custom Only"
            value="custom"
            icon={Icon.Document}
          />
          <List.Dropdown.Item
            title="Default Only"
            value="default"
            icon={Icon.Globe}
          />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadData}
          />
          <Action.Push
            title="Create Custom Cheatsheet"
            icon={Icon.Plus}
            shortcut={{ modifiers: ['cmd'], key: 'n' }}
            target={<CreateCustomCheatsheet onCreated={loadData} />}
          />
        </ActionPanel>
      }
    >
      {searchQuery && (
        <List.Section
          title="Search Results"
          subtitle={`${totalResults} cheatsheets found for "${searchQuery}"`}
        >
          {totalResults === 0 ? (
            <List.Item
              title="No results found"
              subtitle={`Try a different search term or check your spelling`}
              icon={Icon.MagnifyingGlass}
            />
          ) : null}
        </List.Section>
      )}

      {filteredCustomSheets.length > 0 && (
        <List.Section
          title="Custom Cheatsheets"
          subtitle={`${filteredCustomSheets.length} custom sheets`}
        >
          {filteredCustomSheets.map((sheet) => (
            <List.Item
              key={sheet.id}
              title={sheet.title}
              subtitle={sheet.description || 'No description'}
              icon={
                sheet.iconKey
                  ? Service.iconForKey(sheet.iconKey)
                  : Icon.Document
              }
              accessories={[
                { text: 'Custom', icon: Icon.Tag },
                { date: new Date(sheet.updatedAt) },
                ...(sheet.tags || []).slice(0, 3).map((t) => ({ text: t })),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="View">
                    <Action.Push
                      title="View Cheatsheet"
                      icon={Icon.Window}
                      target={<CustomSheetView sheet={sheet} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Actions">
                    <Action
                      title="Copy Full Content"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ['cmd'], key: 'c' }}
                      onAction={async () => {
                        await Clipboard.copy(sheet.content);
                        showToast({
                          style: Toast.Style.Success,
                          title: 'Copied',
                          message: 'Full sheet copied',
                        });
                      }}
                    />
                    <Action
                      title="Add to Favorites"
                      icon={Icon.Star}
                      shortcut={{ modifiers: ['cmd'], key: 'f' }}
                      onAction={async () => {
                        await Service.addToFavorites(
                          'custom',
                          sheet.id,
                          sheet.title,
                        );
                        showToast({
                          style: Toast.Style.Success,
                          title: 'Favorited',
                          message: sheet.title,
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Content"
                      content={sheet.content}
                      icon={Icon.CopyClipboard}
                    />
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={sheet.title}
                      icon={Icon.CopyClipboard}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredDefaultSheets.length > 0 && (
        <List.Section
          title="Default Cheatsheets"
          subtitle={`${filteredDefaultSheets.length} default sheets`}
        >
          {filteredDefaultSheets.map((sheet) => (
            <List.Item
              key={sheet}
              title={sheet}
              subtitle={
                Service.isLocalCheatsheet(sheet)
                  ? 'Local cheatsheet'
                  : 'From online sources'
              }
              icon={Service.resolveIconForSlug(sheet)}
              accessories={[
                {
                  text: Service.isLocalCheatsheet(sheet) ? 'Local' : 'Default',
                  icon: Service.isLocalCheatsheet(sheet)
                    ? Icon.Document
                    : Icon.Globe,
                },
                ...(Service.getDefaultMetadata(sheet)?.tags || [])
                  .slice(0, 3)
                  .map((t) => ({ text: t })),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="View">
                    <Action.Push
                      title="View Cheatsheet"
                      icon={Icon.Window}
                      target={<SheetView slug={sheet} />}
                    />
                    <Action.OpenInBrowser
                      url={Service.urlFor(sheet)}
                      title="Open in Browser"
                      icon={Icon.Link}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Actions">
                    <Action
                      title="Copy Full Content"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ['cmd'], key: 'c' }}
                      onAction={async () => {
                        const content = await Service.getSheet(sheet);
                        await Clipboard.copy(content);
                        showToast({
                          style: Toast.Style.Success,
                          title: 'Copied',
                          message: 'Full sheet copied',
                        });
                      }}
                    />
                    <Action
                      title="Add to Favorites"
                      icon={Icon.Star}
                      shortcut={{ modifiers: ['cmd'], key: 'f' }}
                      onAction={async () => {
                        await Service.addToFavorites('default', sheet, sheet);
                        showToast({
                          style: Toast.Style.Success,
                          title: 'Favorited',
                          message: sheet,
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={sheet}
                      icon={Icon.CopyClipboard}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!searchQuery &&
        filteredCustomSheets.length === 0 &&
        filteredDefaultSheets.length === 0 &&
        !isLoading && (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Start searching"
            description="Type in the search bar to find cheatsheets"
          />
        )}
    </List>
  );
}

// Import the components we need
import { CustomSheetView, SheetView } from './show-cheatsheets';
import { CreateCustomCheatsheet } from './create-custom-cheatsheet';
