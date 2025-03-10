import { Action, ActionPanel, List, useNavigation } from '@raycast/api';
import { useState } from 'react';
import { DeckList } from './DeckList';
import { ClassName } from './domain';
import { classIcon, getGameModeName } from './utils';

export default function Command() {
  const [format, setFormat] = useState(1); // 默认为狂野模式 (1)
  const [minGames, setMinGames] = useState<number>();
  const { push } = useNavigation();

  const classes = Object.values(ClassName);

  const handleFormatChange = (newValue: string) => {
    const [newFormat, newMinGames] = newValue.split('_');
    setFormat(Number(newFormat));
    setMinGames(newMinGames ? Number(newMinGames) : undefined);
  };

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Select Format and Filters" onChange={handleFormatChange}>
          <List.Dropdown.Section title="Game Mode">
            <List.Dropdown.Item title="Wild" value="1" />
            <List.Dropdown.Item title="Standard" value="2" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Minimum Games">
            <List.Dropdown.Item title="50+" value={`${format}_50`} />
            <List.Dropdown.Item title="100+" value={`${format}_100`} />
            <List.Dropdown.Item title="200+" value={`${format}_200`} />
            <List.Dropdown.Item title="400+" value={`${format}_400`} />
            <List.Dropdown.Item title="800+" value={`${format}_800`} />
            <List.Dropdown.Item title="1600+" value={`${format}_1600`} />
            <List.Dropdown.Item title="3200+" value={`${format}_3200`} />
            <List.Dropdown.Item title="6400+" value={`${format}_6400`} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {classes.map((className) => (
        <List.Item
          key={className}
          icon={classIcon(className)}
          title={className}
          actions={
            <Actions
              className={className}
              format={format}
              onViewDecks={() =>
                push(
                  <DeckList
                    className={className}
                    format={format}
                    minGames={minGames} // 这个保留在回调函数中
                  />,
                )
              }
            />
          }
        />
      ))}
    </List>
  );
}

function Actions({
  className,
  format,
  onViewDecks, // 移除未使用的minGames参数
}: {
  className: ClassName;
  format: number;
  onViewDecks: () => void;
}) {
  return (
    <ActionPanel title={className}>
      <ActionPanel.Section>
        <Action title={`View ${getGameModeName(format)} Decks`} onAction={onViewDecks} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
