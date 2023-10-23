import { ActionPanel, Action, Grid, getPreferenceValues } from "@raycast/api";

interface Item {
  name: string;
  keywords: string[];
}

interface Items {
  [key: string]: Item[];
}

interface Props {
  category: string;
  items: Items;
}

interface Preferences {
  itemSize: string | undefined;
}


export function GridView(props: Props): JSX.Element {
  
  function getImagePath(baseDir: string, filename: string) {
    return baseDir + filename.replaceAll('/', '_').replaceAll(' ', '_') + '.webp';
  }

  const columnPreference = parseInt(getPreferenceValues<Preferences>().itemSize ?? '3');

  return (
    <Grid
      columns={columnPreference}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
    >
      {Object.entries(props.items).map(([subCategory, categoriezedItems]) => (
        <Grid.Section title={subCategory} key={subCategory}>
          {categoriezedItems.map(item => (
            <Grid.Item
              content={getImagePath('images/' + props.category + '/', item.name)}
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy to Clipboard" content={item.name} />
                  <Action.OpenInBrowser title="Search in Browser" url={`https://www.google.com/search?q=${item.name}`} />
                </ActionPanel>
              }
              keywords={[subCategory, ...item.keywords]}
              key={subCategory + '_' + item.name}
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
