import { Action, ActionPanel, List, clearSearchBar } from '@raycast/api';
import { Fragment } from 'react';

import { ResultsProps } from './types';
import { getSourceUrl, showSourceAction } from './utils';

const Results = ({ data }: ResultsProps) => {
  return (
    <Fragment>
      {Object.keys(data).map((section) => (
        <List.Section key={section} title={section}>
          {data[section].map(({ objectID, product, subtitle, title, url }) => (
            <List.Item
              key={objectID}
              accessories={[{ text: product }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    onOpen={(_url) => clearSearchBar()}
                    url={url}
                  />
                  {showSourceAction(product, section) && (
                    <Action.OpenInBrowser
                      onOpen={(_url) => clearSearchBar()}
                      title="View Source Code"
                      url={getSourceUrl(product, title)}
                    />
                  )}
                </ActionPanel>
              }
              icon={product === 'MUI X' ? 'mui-x.png' : 'mui-core.png'}
              subtitle={subtitle}
              title={title}
            />
          ))}
        </List.Section>
      ))}
    </Fragment>
  );
};

export default Results;
