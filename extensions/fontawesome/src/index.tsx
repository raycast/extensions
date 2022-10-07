import { Action, ActionPanel, Grid, closeMainWindow, showHUD, Clipboard, environment } from '@raycast/api';
import { useEffect, useState } from 'react';
import { capitalCase } from 'change-case';
import icons from './icons.json';
import { readFileSync } from 'fs';

function getFullFilename(folder: string, fullFilename: string, png: boolean) {
  const containingFolder = png ? 'pngs' : `${environment.assetsPath}/svgs`;
  const filename = fullFilename.slice(0, -3) + (png ? 'png' : 'svg');
  return `${containingFolder}/${folder}/${filename}`;
}

export default function Command() {
  const [filter, setFilter] = useState('');
  const [filteredList, filterList] = useState(icons);

  useEffect(() => {
    const lcaseFilter = filter.toLowerCase();
    filterList(
      icons.map((group) => ({
        folder: group.folder,
        icons: group.icons.filter((icon) => icon.label.toLowerCase().includes(lcaseFilter)),
      }))
    );
  }, [filter]);

  async function copySVG(folder: string, filename: string) {
    const svg = readFileSync(getFullFilename(folder, filename, false));
    const svgWithCurrentColor = svg.toString().replace(/<path/g, '<path fill="currentColor"');
    await Clipboard.copy(svgWithCurrentColor);
    showHUD('SVG copied to clipboard!');
    closeMainWindow();
  }

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Large}
      enableFiltering={false}
      onSearchTextChange={setFilter}
      navigationTitle="Search Font Awesome"
      searchBarPlaceholder="Search Font Awesome icons"
    >
      {filteredList
        .filter((group) => group.folder === 'regular')
        .map((group) => (
          <Grid.Section key={group.folder} title={capitalCase(group.folder)}>
            {group.icons.map((icon) => (
              <Grid.Item
                key={icon.filename}
                content={getFullFilename(group.folder, icon.filename, true)}
                actions={
                  <ActionPanel>
                    <Action title="Copy SVG" onAction={() => copySVG(group.folder, icon.filename)} />
                    <Action.OpenInBrowser
                      title="Open In Browser"
                      url={`https://fontawesome.com/icons/${icon.filename.slice(0, -4)}?s=solid&f=classic`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}
