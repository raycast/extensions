import { Action, ActionPanel, Color, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import { getLogIconByLevel, getTextAndIconFromVal, isValidApiUrl } from "./utils";
import ListWebDomainsComponent from "./components/list-web-domains";
import ListDatabasesComponent from "./components/list-databases";
import ListMailDomainsComponent from "./components/list-mail-domains";
import ListItemDetailComponent from "./components/ListItemDetailComponent";
import {
  getUserAuthLog,
  getUserBackups,
  getUserLogs,
  getUserNotifications,
  getUserPackages,
  getUserStats,
  getUsers,
} from "./utils/hestia";
import ErrorComponent from "./components/ErrorComponent";
import { AddUserFormValues } from "./types/users";
import useHestia from "./utils/hooks/useHestia";
import InvalidUrlComponent from "./components/InvalidUrlComponent";
import { NodeHtmlMarkdown } from "node-html-markdown";
import ListCronJobsComponent from "./components/list-cron-jobs";

export default function ListUsers() {
  if (!isValidApiUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: users, revalidate, error } = getUsers();

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      {users && (
        <List.Section title={`${Object.keys(users).length} users`}>
          {Object.entries(users).map(([user, data]) => (
            <List.Item
              key={user}
              title={user}
              icon={{
                source: data.ROLE === "admin" ? Icon.PersonCircle : Icon.Person,
                tintColor: data.SUSPENDED === "yes" ? Color.Red : Color.Green,
              }}
              detail={<ListItemDetailComponent data={data} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy to Clipboard as JSON"
                    icon={Icon.Clipboard}
                    content={JSON.stringify(data)}
                  />
                  <ActionPanel.Section>
                    {/* eslint-disable-next-line @raycast/prefer-title-case */}
                    <ActionPanel.Submenu title="Go To" icon={Icon.ArrowRight}>
                      <Action.Push
                        title="Web Domains"
                        icon={Icon.Globe}
                        target={<ListWebDomainsComponent user={user} />}
                      />
                      <Action.Push title="Databases" icon={Icon.Coin} target={<ListDatabasesComponent user={user} />} />
                      <Action.Push
                        title="Mail Domains"
                        icon={Icon.Envelope}
                        target={<ListMailDomainsComponent user={user} />}
                      />
                      <Action.Push title="Cron Jobs" icon={Icon.Clock} target={<ListCronJobsComponent user={user} />} />
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push title="View Stats" icon={Icon.Eye} target={<ViewUserStats user={user} />} />
                    <Action.Push title="View Logs" icon={Icon.BulletPoints} target={<ViewUserLogs user={user} />} />
                    <Action.Push
                      title="View Login History"
                      icon={Icon.Binoculars}
                      target={<ViewUserAuthLog user={user} />}
                    />
                    <Action.Push
                      title="View Notifications"
                      icon={Icon.Bell}
                      target={<ViewUserNotifications user={user} />}
                    />
                    <Action.Push title="View Backups" icon={Icon.Cloud} target={<ViewUserBackups user={user} />} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add User"
            icon={Icon.AddPerson}
            actions={
              <ActionPanel>
                <Action.Push title="Add User" icon={Icon.AddPerson} target={<AddUser onUserAdded={revalidate} />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type ViewUserStatsProps = {
  user: string;
};
export function ViewUserStats({ user }: ViewUserStatsProps) {
  const { isLoading, data: stats } = getUserStats(user);

  return (
    <List navigationTitle={`Users / ${user} / Stats`} isLoading={isLoading} isShowingDetail>
      {stats &&
        Object.entries(stats).map(([date, data]) => (
          <List.Item
            key={date}
            title={date}
            detail={<ListItemDetailComponent data={data} />}
            accessories={[{ date: new Date(date) }]}
          />
        ))}
    </List>
  );
}

type ViewUserLogsProps = {
  user: string;
};
export function ViewUserLogs({ user }: ViewUserLogsProps) {
  const [filter, setFilter] = useState("");
  const { isLoading, data: logs } = getUserLogs(user);

  const filteredLogs = !logs
    ? undefined
    : !filter
      ? logs
      : Object.fromEntries(
          Object.entries(logs).filter(([, data]) => {
            const filter_type = filter.split("_")[0].toUpperCase();
            const filter_value = filter.split("_")[1];
            return data[filter_type as keyof typeof data] === filter_value;
          }),
        );

  return (
    <List
      navigationTitle={`Users / ${user} / Logs`}
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={(val) => setFilter(val)}>
          <List.Dropdown.Item title="All" value="" icon={Icon.Dot} />
          {logs && (
            <>
              <List.Dropdown.Section title="Level">
                <List.Dropdown.Item
                  title="Info"
                  value="level_Info"
                  icon={{ source: Icon.Info, tintColor: Color.Blue }}
                />
                <List.Dropdown.Item
                  title="Warning"
                  value="level_Warning"
                  icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
                />
                <List.Dropdown.Item
                  title="Error"
                  value="level_Error"
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                />
              </List.Dropdown.Section>
              <List.Dropdown.Section title="Category">
                {Array.from(
                  new Set(
                    Object.values(logs)
                      .map((log) => log.CATEGORY)
                      .flat(),
                  ),
                ).map((category) => (
                  <List.Dropdown.Item key={category} title={category} value={`category_${category}`} />
                ))}
              </List.Dropdown.Section>
            </>
          )}
        </List.Dropdown>
      }
    >
      <List.Section
        title={filteredLogs && logs && `${Object.keys(filteredLogs).length} of ${Object.keys(logs).length} lines`}
      >
        {filteredLogs &&
          Object.entries(filteredLogs)
            .sort(([keyA], [keyB]) => Number(keyB) - Number(keyA)) // we reverse so latest log is at top
            .map(([line, data]) => (
              <List.Item
                key={line}
                title={line}
                detail={<ListItemDetailComponent data={data} />}
                accessories={[{ date: new Date(data.DATE) }, { tag: data.CATEGORY }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title={`Copy Line#${line} Message to Clipboard`} content={data.MESSAGE} />
                    <Action.CopyToClipboard title={`Copy All to Clipboard as JSON`} content={JSON.stringify(logs)} />
                  </ActionPanel>
                }
                icon={getLogIconByLevel(data.LEVEL)}
              />
            ))}
      </List.Section>
    </List>
  );
}

type ViewUserAuthLogProps = {
  user: string;
};
export function ViewUserAuthLog({ user }: ViewUserAuthLogProps) {
  const { isLoading, data: authLog } = getUserAuthLog(user);

  return (
    <List navigationTitle={`Users / ${user} / Auth Log`} isLoading={isLoading} isShowingDetail>
      {authLog &&
        Object.entries(authLog)
          .sort(([keyA], [keyB]) => Number(keyB) - Number(keyA)) // we reverse so latest log is at top
          .map(([line, data]) => (
            <List.Item
              key={line}
              title={line}
              detail={
                <List.Item.Detail
                  markdown={data.USER_AGENT}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(data).map(([key, val]) => {
                        if (val === "success")
                          return (
                            <List.Item.Detail.Metadata.TagList key={key} title={key}>
                              <List.Item.Detail.Metadata.TagList.Item
                                text={val}
                                color={val === "success" ? Color.Green : Color.Red}
                              />
                            </List.Item.Detail.Metadata.TagList>
                          );

                        const { text, icon } = getTextAndIconFromVal(val);
                        return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
                      })}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[{ date: new Date(data.DATE) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={`Copy Line#${line} to Clipboard`} content={JSON.stringify(data)} />
                  <Action.CopyToClipboard title={`Copy All to Clipboard as JSON`} content={JSON.stringify(authLog)} />
                </ActionPanel>
              }
              icon={
                data.STATUS === "success"
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.MinusCircle, tintColor: Color.Red }
              }
            />
          ))}
    </List>
  );
}

type ViewUserNotificationsProps = {
  user: string;
};
export function ViewUserNotifications({ user }: ViewUserNotificationsProps) {
  const { isLoading, data: notifications, revalidate } = getUserNotifications(user);

  const [acknowledgeId, setAcknowledgeId] = useState("");
  const { isLoading: isAcknowledging } = useHestia<Record<string, never>>(
    "v-acknowledge-user-notification",
    "Acknowledging Notification(s)",
    {
      body: [user, acknowledgeId],
      execute: !!acknowledgeId,
      onData: revalidate,
      onError() {
        setAcknowledgeId("");
      },
    },
  );

  return (
    <List navigationTitle={`Users / ${user} / Notifications`} isLoading={isLoading || isAcknowledging} isShowingDetail>
      {notifications &&
        Object.entries(notifications).map(([line, data]) => (
          <List.Item
            key={line}
            title={line}
            detail={
              <List.Item.Detail
                markdown={NodeHtmlMarkdown.translate(data.NOTICE)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(data).map(([key, val]) => {
                      const { text, icon } = getTextAndIconFromVal(val);
                      return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={[{ date: new Date(data.DATE) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy Line#${line} to Clipboard`} content={JSON.stringify(data)} />
                <Action.CopyToClipboard
                  title={`Copy All to Clipboard as JSON`}
                  content={JSON.stringify(notifications)}
                />
                {!data.ACK && (
                  <Action
                    icon={Icon.BellDisabled}
                    title="Acknowledge Notification"
                    onAction={() => setAcknowledgeId(line)}
                  />
                )}
              </ActionPanel>
            }
            icon={data.ACK === "yes" ? Icon.BellDisabled : { source: Icon.Bell, tintColor: Color.Yellow }}
          />
        ))}
    </List>
  );
}

type ViewUserBackupsProps = {
  user: string;
};
export function ViewUserBackups({ user }: ViewUserBackupsProps) {
  const { isLoading, data: backups } = getUserBackups(user);

  return (
    <List navigationTitle={`Users / ${user} / Backups`} isLoading={isLoading} isShowingDetail>
      {backups &&
        Object.entries(backups).map(([backup, data]) => (
          <List.Item
            key={backup}
            title={backup}
            detail={
              <List.Item.Detail
                markdown={`# File Name: ${backup} \n\n UDIR: \n ${data.UDIR}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(data).map(([key, val]) => {
                      const { text, icon } = getTextAndIconFromVal(val);
                      return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={[{ date: new Date(data.DATE) }]}
            icon={Icon.Cloud}
          />
        ))}
    </List>
  );
}

type AddUserProps = {
  onUserAdded: () => void;
};
function AddUser({ onUserAdded }: AddUserProps) {
  const { pop } = useNavigation();
  const { isLoading: isFetching, data: userPackages } = getUserPackages();
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<AddUserFormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      user: FormValidation.Required,
      password: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  const { isLoading: isAdding } = useHestia<Record<string, never>>("v-add-user", "Adding User", {
    body: [values.user, values.password, values.email, values.package, values.name],
    execute,
    async onData() {
      await showToast({
        title: "SUCCESS",
        message: `Added ${values.user}<${values.email}>`,
      });
      onUserAdded();
      pop();
    },
  });

  const isLoading = isFetching || isAdding;

  return (
    <Form
      navigationTitle="Add User"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" placeholder="user@email.example" {...itemProps.email} />
      <Form.TextField title="Username" placeholder="user" {...itemProps.user} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />
      <Form.Dropdown title="Package" {...itemProps.package}>
        {userPackages &&
          Object.keys(userPackages).map((packageName) => (
            <Form.Dropdown.Item key={packageName} title={packageName} value={packageName} />
          ))}
      </Form.Dropdown>
      <Form.TextField title="Contact Name" placeholder="Contact Name" {...itemProps.name} />
    </Form>
  );
}
