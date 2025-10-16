import { List } from '@raycast/api';
import { useState } from 'react';
import { NodeVersionListItem } from './components/NodeVersionListItem';
import { FILTERS } from './config';
import { createVersionsBySection, isFilterValue } from './helpers';
import { useFetchNodeVersions } from './hooks/useFetchNodeVersions';

export default function Command() {
  const { data, error, isLoading } = useFetchNodeVersions();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('latest');
  const filteredVersionElements = filter === 'lts' ? data?.filter((version) => filter === 'lts' && version.lts) : data;

  const handleChangeDropdown = (value: string) => {
    if (!isFilterValue(value)) {
      console.warn(`Invalid filter value: ${value}`);
      return;
    }
    setFilter(value);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Node Version"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" defaultValue="latest" storeValue onChange={handleChangeDropdown}>
          {FILTERS.map(({ title, value }) => (
            <List.Dropdown.Item key={value} title={title} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {isLoading && <List.EmptyView title="Loading..." />}
      {error && <List.EmptyView title={error.message} />}
      {filteredVersionElements && (
        <>
          {filter === 'latest' ? (
            <List.Section title="Latest">
              {createVersionsBySection(filteredVersionElements).flatMap(([, versions]) => {
                const [props] = versions;
                return <NodeVersionListItem key={props.version} {...props} />;
              })}
            </List.Section>
          ) : (
            createVersionsBySection(filteredVersionElements).map(([sectionTitle, versions]) => (
              <List.Section key={sectionTitle} title={sectionTitle}>
                {versions.map((props) => (
                  <NodeVersionListItem key={props.version} {...props} />
                ))}
              </List.Section>
            ))
          )}
        </>
      )}
    </List>
  );
}
