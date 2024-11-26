import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from '@raycast/api';
import { usePromise } from '@raycast/utils';
import api from '../../utils/api';
import { DNSRecord, Domain } from '../../utils/interfaces';
import { useState } from 'react';
import { handleNetworkError } from '../../utils/helpers';
import CreateDNSRecordComponent from './create-dns-records';

interface Props {
  domain: Domain;
}
export default function ManageDNSRecords({ domain }: Props) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [filter, setFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmAndDeleteRecord(record: DNSRecord) {
    const options: Alert.Options = {
      icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
      title: `Delete DNS record?`,
      message: `Are you sure you want to delete this ${record.type} record? \n\n ${record.hostname} = ${record.value}`,
      primaryAction: {
        title: 'Delete',
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          try {
            setIsDeleting(true);
            await showToast({
              title: `Deleting ${record.type} record`,
              style: Toast.Style.Animated,
            });
            await api.deleteDNSRecord(domain.id, record.id);
            await showToast({
              title: `Deleted ${record.type} record`,
            });
            revalidate();
          } catch (e) {
            handleNetworkError(e);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    };
    await confirmAlert(options);
  }

  const {
    data: records,
    isLoading: isFetching,
    revalidate,
  } = usePromise(async () => await api.getDNSRecords(domain.id), [], {
    async onWillExecute() {
      await showToast({
        title: `Fetching DNS Records for ${domain.name}`,
        style: Toast.Style.Animated,
      });
    },
    async onData(data) {
      await showToast({
        title: `Fetched ${data.length} DNS Records for ${domain.name}`,
      });
    },
  });

  const isLoading = isFetching || isDeleting;

  const filteredRecords = !filter
    ? records
    : records?.filter((record) => record.type === filter);

  return (
    <List
      navigationTitle={`Domains / ${domain.name} / Manage DNS Records`}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Section title="Records">
            {[...new Set(records?.map((record) => record.type))].map((type) => (
              <List.Dropdown.Item key={type} title={type} value={type} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={domain.name}>
        {filteredRecords?.map((record) => (
          <List.Item
            key={record.id}
            title={record.hostname}
            subtitle={record.value}
            accessories={[
              { text: record.ttl.toString() },
              { tag: record.type },
            ]}
            detail={
              <List.Item.Detail
                markdown={`${record.hostname} = ${record.value}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Name"
                      text={record.hostname}
                    />
                    <List.Item.Detail.Metadata.TagList title="Type">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={record.type}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="TTL"
                      text={`${record.ttl} seconds`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Priority"
                      text={record.priority?.toString() || ''}
                      icon={!record.priority ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Weight"
                      text={record.weight?.toString() || ''}
                      icon={!record.weight ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Port"
                      text={record.port?.toString() || ''}
                      icon={!record.port ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Flag"
                      text={record.flag?.toString() || ''}
                      icon={!record.flag ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Tag"
                      text={record.tag || ''}
                      icon={!record.tag ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Site ID"
                      text={record.site_id || ''}
                      icon={!record.site_id ? Icon.Minus : undefined}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="DNS Zone ID"
                      text={record.dns_zone_id}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Managed"
                      icon={record.managed ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Value"
                      text={record.value}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action
                  title={`Delete ${record.type} Record`}
                  style={Action.Style.Destructive}
                  icon={Icon.DeleteDocument}
                  onAction={() => confirmAndDeleteRecord(record)}
                />
                <Action.Push
                  title="Create DNS Record"
                  icon={Icon.Plus}
                  target={
                    <CreateDNSRecordComponent
                      domain={domain}
                      onDNSRecordCreated={revalidate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create DNS Record"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create DNS Record"
                  icon={Icon.Plus}
                  target={
                    <CreateDNSRecordComponent
                      domain={domain}
                      onDNSRecordCreated={revalidate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
