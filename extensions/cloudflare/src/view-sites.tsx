import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';

import Service, { Zone } from './service';
import {
  getToken,
  getSiteStatusIcon,
  getSiteUrl,
  handleNetworkError,
} from './utils';
import { CachePurgeView, purgeEverything } from './view-cache-purge';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';

const service = new Service(getToken());

function Command() {
  const {
    isLoading,
    data: { accounts, sites },
  } = useCachedPromise(
    async () => {
      const accounts = await service.listAccounts();
      // load zones of each account simultaneously
      const sites: Record<string, Zone[]> = {};
      const zoneRequests = accounts.map(async (account) => {
        const zones = await service.listZones(account);
        sites[account.id] = zones;
      });
      await Promise.all(zoneRequests);
      return {
        accounts,
        sites,
      };
    },
    [],
    {
      initialData: {
        accounts: [],
        sites: [],
      },
      onError: handleNetworkError,
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !Object.keys(sites).length && (
        <List.EmptyView
          icon="no-sites.svg"
          title="Add your website or application to Cloudflare"
          description="Connect your domain to start sending web traffic through Cloudflare."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://dash.cloudflare.com/" />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(sites)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, accountSites] = entry;
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name} key={accountId}>
              {accountSites.map((site) => (
                <List.Item
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Document}
                          title="Show Details"
                          target={
                            <SiteView accountId={accountId} id={site.id} />
                          }
                        />
                        <Action.Push
                          icon={Icon.List}
                          // eslint-disable-next-line @raycast/prefer-title-case
                          title="Show DNS Records"
                          target={<DnsRecordView siteId={site.id} />}
                        />
                        <Action.OpenInBrowser
                          title="Open on Cloudflare"
                          url={getSiteUrl(accountId, site.name)}
                          shortcut={{ modifiers: ['cmd'], key: 'o' }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Hammer}
                          title="Purge Files from Cache by URL"
                          target={
                            <CachePurgeView
                              accountId={accountId}
                              id={site.id}
                            />
                          }
                          shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
                        />
                        <Action
                          icon={Icon.Hammer}
                          title="Purge Everything from Cache"
                          shortcut={{ modifiers: ['cmd'], key: 'e' }}
                          onAction={async () => {
                            purgeEverything(site);
                          }}
                        />
                        <Action
                          icon={Icon.ArrowClockwise}
                          title="Reload Sites from Cloudflare"
                          onAction={clearSiteCache}
                          shortcut={{ modifiers: ['cmd'], key: 'r' }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          icon={Icon.CopyClipboard}
                          content={site.name}
                          title="Copy Site URL"
                          shortcut={{ modifiers: ['cmd'], key: '.' }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                  icon={getSiteStatusIcon(site.status)}
                  key={site.id}
                  title={site.name}
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

export interface SiteProps {
  accountId: string;
  id: string;
}

function SiteView(props: SiteProps) {
  const { accountId, id } = props;

  const { isLoading, data: site } = useCachedPromise(
    async () => service.getZone(id),
    [],
    {
      onError: handleNetworkError,
    },
  );

  if (!site) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const markdown = `
  # Site

  ## Name

  ${site.name}

  ## Status

  ${site.status}

  ## Name servers

  ${site.name_servers.map((server) => `* ${server}`).join('\n\n')}
  `;
  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.List}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Show DNS Records"
              target={<DnsRecordView siteId={site.id} />}
            />
            <Action.OpenInBrowser
              title="Open on Cloudflare"
              url={getSiteUrl(accountId, site.name)}
              shortcut={{ modifiers: ['cmd'], key: 'o' }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              content={site.name}
              title="Copy Site URL"
              shortcut={{ modifiers: ['cmd'], key: '.' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Modified" text={site.modified_on} />
          <Detail.Metadata.Label title="Created" text={site.created_on} />
          <Detail.Metadata.Label title="Activated" text={site.activated_on} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Permissions">
            {site.permissions.map((permission) => (
              <Detail.Metadata.TagList.Item
                key={permission}
                text={permission}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

interface DnsRecordProps {
  siteId: string;
}

function DnsRecordView(props: DnsRecordProps) {
  const { siteId } = props;
  const {
    isLoading,
    data: records,
    revalidate,
    mutate,
  } = useCachedPromise(async () => await service.listDnsRecords(siteId), [], {
    initialData: [],
    onError: handleNetworkError,
  });

  return (
    <List isLoading={isLoading}>
      {records.map((record, index) => (
        <List.Item
          key={index}
          title={record.name}
          subtitle={record.content}
          accessories={[{ text: record.type }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.name}
                  title="Copy Record Name"
                  shortcut={{ modifiers: ['cmd'], key: '.' }}
                />
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.content}
                  title="Copy Record Value"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }}
                />
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  content={record.type}
                  title="Copy Record Type"
                  shortcut={{ modifiers: ['opt', 'shift'], key: '.' }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Record"
                  target={
                    <CreateDnsRecordView
                      siteId={siteId}
                      onCreate={revalidate}
                    />
                  }
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Record"
                  onAction={() =>
                    confirmAlert({
                      title: 'Delete DNS records',
                      message: `Are you sure you want to permanently delete the '${record.type} - ${record.content.slice(0, 50)}' record?`,
                      primaryAction: {
                        title: 'Delete',
                        style: Alert.ActionStyle.Destructive,
                        async onAction() {
                          const toast = await showToast(
                            Toast.Style.Animated,
                            'Deleting DNS Record',
                            record.id,
                          );
                          try {
                            await mutate(
                              service.deleteDnsRecord(siteId, record.id),
                              {
                                optimisticUpdate(data) {
                                  return data.filter((d) => d.id !== record.id);
                                },
                                shouldRevalidateAfter: false,
                              },
                            );
                            toast.style = Toast.Style.Success;
                            toast.title = 'Deleted DNS Record';
                          } catch (error) {
                            handleNetworkError(error);
                          }
                        },
                      },
                    })
                  }
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateDnsRecordView({
  siteId,
  onCreate,
}: {
  siteId: string;
  onCreate: () => void;
}) {
  const { pop } = useNavigation();
  interface FormValues {
    type: string;
    name: string;
    content: string;
    ttl: string;
    comment: string;
  }
  const TYPES: Record<string, string> = {
    A: 'IPv4 address',
    AAAA: 'IPv6 address',
    TXT: 'Content',
  };
  const TTLS = {
    1: 'Auto',
    60: '1 min',
    120: '2 min',
    300: '5 min',
    600: '10 min',
    900: '15 min',
    1800: '30 min',
    3600: '1 hr',
    7200: '2 hr',
    18000: '5 hr',
    43200: '12 hr',
    86400: '1 day',
  };

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(
        Toast.Style.Animated,
        'Creating DNS Record',
        values.type,
      );
      try {
        const record = values;
        const content = `"${record.content}"`; // if we do not add quotation marks it will still work but shows a warning on Dash
        const ttl = values.type !== 'TXT' ? 1 : +record.ttl; // errors out if we do not pass a number

        await service.createDnsRecord(siteId, { ...record, content, ttl });
        toast.style = Toast.Style.Success;
        toast.title = 'Created DNS Record';
        onCreate();
        pop();
      } catch (error) {
        handleNetworkError(error);
      }
    },
    initialValues: {
      type: 'A',
      ttl: '1',
    },
    validation: {
      name: FormValidation.Required,
      content: FormValidation.Required,
      comment(value) {
        if (value && value.length > 100)
          return 'Comment must not be more than 100 characters';
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        {Object.keys(TYPES).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Name"
        placeholder="Use @ for root"
        {...itemProps.name}
      />
      {values.type !== 'TXT' ? (
        <>
          <Form.TextField title={TYPES[values.type]} {...itemProps.content} />
          <Form.Description title="TTL" text="Auto" />
        </>
      ) : (
        <>
          <Form.TextArea title="Content" {...itemProps.content} />
          <Form.Dropdown title="TTL" {...itemProps.ttl}>
            {Object.entries(TTLS).map(([ttl, title]) => (
              <Form.Dropdown.Item key={ttl} title={title} value={ttl} />
            ))}
          </Form.Dropdown>
        </>
      )}

      <Form.Separator />
      <Form.Description
        title="Record Attributes"
        text="The information provided here will not impact DNS record resolution and is only meant for your reference."
      />
      <Form.TextField
        title="Comment"
        placeholder="Enter your comment here (up to 100 characters)."
        {...itemProps.comment}
      />
    </Form>
  );
}

async function clearSiteCache() {
  service.clearCache();
  showToast({
    style: Toast.Style.Success,
    title: 'Local site cache cleared',
  });
  popToRoot({ clearSearchBar: true });
}

export default Command;
