import { Action, ActionPanel, Detail, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import uniqolor from "uniqolor";
import { Application, isAuthenticationError, restartMachine, useApplications } from "./fly";

export default function Command() {
  const { data, isLoading } = useApplications();

  if (!isLoading && isAuthenticationError(data)) {
    return <AuthenticationError />;
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      <List.Section title="Applications">
        {!isLoading && data?.data.apps.nodes?.map((app) => <Application key={app?.name} app={app} />)}
      </List.Section>
    </List>
  );
}

function Application({ app }: { app: Application }) {
  return (
    <List.Item title={app.name} detail={<ApplicationDetail app={app} />} actions={<ApplicationActions app={app} />} />
  );
}

function ApplicationDetail({ app }: { app: Application }) {
  const http = (value: string) => `https://${value}`;
  const isMb = app.vmSize.memoryGb < 1;
  const hostname = app.hostname && http(app.hostname);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="State">
            <List.Item.Detail.Metadata.TagList.Item text={app.state.toLowerCase()} color={uniqolor(app.state).color} />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Label title="Organization" text={app.organization.name} />

          {hostname && <List.Item.Detail.Metadata.Link title="Hostname" text={hostname} target={hostname} />}

          <List.Item.Detail.Metadata.Label title="Machine Count" text={String(app.machines?.nodes?.length ?? 0)} />

          <List.Item.Detail.Metadata.Label
            title="Machine Size"
            text={`${app.vmSize.name}@${isMb ? app.vmSize.memoryMb + "MB" : app.vmSize.memoryGb + "GB"}`}
          />

          <List.Item.Detail.Metadata.Label title="Volumes" text={String(app.volumes?.nodes?.length ?? 0)} />

          {app.regions ? (
            <List.Item.Detail.Metadata.TagList title="Regions">
              {app.regions.map((region) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={region.code}
                  text={region.code}
                  color={uniqolor(region.code, { lightness: [70, 100] }).color}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          <List.Item.Detail.Metadata.Label title="Public IPs" text={String(app.ipAddresses?.nodes?.length ?? 0)} />

          {app.currentRelease ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Current Release" />
              <List.Item.Detail.Metadata.Label
                title="Date"
                text={app.currentRelease.createdAt.replace("T", " ").replace("Z", " UTC")}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={app.currentRelease.status}
                  color={uniqolor(app.currentRelease.status, { lightness: [70, 100] }).color}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Image" text={app.currentRelease.imageRef} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    ></List.Item.Detail>
  );
}

function ApplicationActions({ app }: { app: Application }) {
  const ips = app.ipAddresses?.nodes?.map((ip) => ip.address) ?? [];

  return (
    <ActionPanel title="Application Actions">
      <Action.OpenInBrowser title="Open Dashboard" url={`https://fly.io/apps/${app.name}`} />
      <Action.OpenInBrowser title="Open Monitoring" url={`https://fly.io/apps/${app.name}/monitoring`} />
      <Action.OpenInBrowser title="Open Metrics" url={`https://fly.io/apps/${app.name}/metrics`} />

      {app.hostname ? <Action.OpenInBrowser title="Open Hostname" url={`https://${app.hostname}`} /> : null}
      {app.hostname ? <Action.CopyToClipboard title="Copy Hostname" content={app.hostname} /> : null}

      {ips.length === 1 ? <Action.CopyToClipboard title="Copy IP" content={ips[0]} /> : null}
      {ips.length > 1
        ? ips.map((ip) => <Action.CopyToClipboard key={ip} title={`Copy IP: ${ip}`} content={ip} />)
        : null}

      {app.currentRelease ? (
        <Action.CopyToClipboard title="Copy Current Release Image" content={app.currentRelease.imageRef} />
      ) : null}

      {app.state === "DEPLOYED" && app.machines?.nodes.length ? (
        <Action
          title="Restart Application"
          style={Action.Style.Destructive}
          icon={Icon.RotateClockwise}
          onAction={async () => {
            const machines = app.machines?.nodes ?? [];

            const toast = await showToast({
              title: app.id,
              message: "preparing to restart application...",
              style: Toast.Style.Animated,
            });

            if (machines.length < 1) {
              toast.message = "application does not have machines to restart";
              toast.style = Toast.Style.Success;
            }

            try {
              for (let i = 0; i < machines.length; i++) {
                toast.message = `restarting machine ${i + 1}/${machines.length}`;
                await restartMachine(app.name, machines[i].id);
              }

              toast.message = "all machines restarted";
              toast.style = Toast.Style.Success;
            } catch (error) {
              console.log(error);
              toast.message = "failed to restart a machine";
              toast.style = Toast.Style.Failure;
            }
          }}
        />
      ) : null}
    </ActionPanel>
  );
}

function AuthenticationError() {
  const markdown =
    "# Fly.io Extension Error\n **Your authentication token appears to be invalid.**\n\n Please [regenerate](https://fly.io/docs/flyctl/auth-token/) another authentication token and update it in extension preferences and try again.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
