import { Action, ActionPanel, Grid, useNavigation } from '@raycast/api';
import { useState } from 'react';
import { DeckList } from './components/deck-list';
import { ClassName } from './types/types';
import { classIcon, getGameModeName } from './utils/utils';

export default function Command() {
  const [format, setFormat] = useState(1);
  const [minGames, setMinGames] = useState<number>();
  const { push } = useNavigation();

  const classes = Object.values(ClassName);

  const handleFormatChange = (newValue: string) => {
    const [newFormat, newMinGames] = newValue.split('_');
    setFormat(Number(newFormat));
    setMinGames(newMinGames ? Number(newMinGames) : undefined);
  };

  return (
    <Grid
      columns={5} // 设置列数
      inset={Grid.Inset.Medium} // 使用中等内边距
      aspectRatio="1" // 确保每个元素是正方形
      fit={Grid.Fit.Fill} // 填充可用空间
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Format and Filters" onChange={handleFormatChange}>
          <Grid.Dropdown.Section title="Game Mode">
            <Grid.Dropdown.Item title="Wild" value="1" />
            <Grid.Dropdown.Item title="Standard" value="2" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Minimum Games">
            <Grid.Dropdown.Item title="50+" value={`${format}_50`} />
            <Grid.Dropdown.Item title="100+" value={`${format}_100`} />
            <Grid.Dropdown.Item title="200+" value={`${format}_200`} />
            <Grid.Dropdown.Item title="400+" value={`${format}_400`} />
            <Grid.Dropdown.Item title="800+" value={`${format}_800`} />
            <Grid.Dropdown.Item title="1600+" value={`${format}_1600`} />
            <Grid.Dropdown.Item title="3200+" value={`${format}_3200`} />
            <Grid.Dropdown.Item title="6400+" value={`${format}_6400`} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {classes.map((className) => (
        <Grid.Item
          key={className}
          content={{ source: classIcon(className).source, tintColor: null }}
          title={className}
          actions={
            <ActionPanel title={className}>
              <ActionPanel.Section>
                <Action
                  title={`View ${getGameModeName(format)} Decks`}
                  onAction={() => push(<DeckList className={className} format={format} minGames={minGames} />)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
