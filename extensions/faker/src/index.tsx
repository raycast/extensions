import { ActionPanel, CopyToClipboardAction, Icon, List } from '@raycast/api';
import faker from 'faker';
import _ from 'lodash';

const blacklistPaths = ['locales', 'locale', 'localeFallback', 'definitions', 'fake', 'unique', 'mersenne'];

type Item = {
  id: string;
  title: string;
  value: string;
};

const buildItems = (path: string) => {
  console.log('buildItems', path);
  return _.reduce(
    path ? _.get(faker, path) : faker,
    (acc: Item[], func, key) => {
      if (blacklistPaths.includes(key)) {
        return acc;
      }

      console.log({ acc, key, func });
      if (_.isFunction(func)) {
        acc.push({ id: key, title: key, value: func() });
      } else {
        acc.push(...buildItems(path ? `${path}.${key}` : key));
      }

      return acc;
    },
    []
  );
};

export default function Command() {
  const items = buildItems();
  console.log(items);
  return <div />;
  return (
    <List>
      {sections.map((section) => (
        <List.Section key={section} title={section}>
          {buildItems(section).map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              subtitle={item.value}
              icon={Icon.Dot}
              accessoryTitle={item.value}
              // actions={
              //   <ActionPanel>
              //     <OpenInBrowserAction url={article.url} />
              //     <CopyToClipboardAction title="Copy URL" content={article.url} />
              //   </ActionPanel>
              // }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
