import { Fragment } from 'react';

import { Action, ActionPanel, List, clearSearchBar } from '@raycast/api';

import { getSourceUrl, showSourceAction } from './utils';
import { ResultsProps } from './types';

const Results = ({ data }: ResultsProps) => {
  return (
    <Fragment>
      {Object.keys(data).map((section) => (
        <List.Section key={section} title={section}>
          {data[section].map(({ objectID, product, title, subtitle, url }) => (
            <List.Item
              key={objectID}
              icon={product === 'MUI X' ? 'mui-x.png' : 'mui-core.png'}
              title={title}
              subtitle={subtitle}
              accessories={[{ text: product }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={url}
                    onOpen={(_url) => clearSearchBar()}
                  />
                  {showSourceAction(product, section) && (
                    <Action.OpenInBrowser
                      url={getSourceUrl(product, title)}
                      title="View Source Code"
                      onOpen={(_url) => clearSearchBar()}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </Fragment>
  );
};

export default Results;
