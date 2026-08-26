import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { FxErrorActions } from "./components/fx-error-actions";
import {
  defaultWorkingDirectory,
  FxDoctorCheck,
  FxDoctorResponse,
  FxStatusResponse,
  getFxPreferences,
  markdownEscape,
  runFxJson,
} from "./lib/fx";

function checkAppearance(status: string) {
  if (status === "ok") return { icon: Icon.CheckCircle, color: Color.Green, label: "Passed" };
  if (status === "warn") return { icon: Icon.ExclamationMark, color: Color.Orange, label: "Warning" };
  return { icon: Icon.XMarkCircle, color: Color.Red, label: status === "fail" ? "Failed" : status };
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summaryMarkdown(status: FxStatusResponse, doctor: FxDoctorResponse): string {
  const total = (doctor.ok_count || 0) + (doctor.warn_count || 0) + (doctor.fail_count || 0);
  const state = doctor.fail_count
    ? "fx needs attention"
    : doctor.warn_count
      ? "fx is working with warnings"
      : "fx is healthy";
  return `# ${state}\n\n${total} local checks ran for \`${markdownEscape(status.workspace || doctor.workspace || "current workspace")}\`. Select any check in the list to inspect it.`;
}

function HealthActions({
  data,
  revalidate,
}: {
  data: { status: FxStatusResponse; doctor: FxDoctorResponse };
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh Health Checks"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.CopyToClipboard title="Copy Health Report JSON" content={JSON.stringify(data, null, 2)} />
      {data.status.workspace ? (
        <Action.ShowInFinder title="Show Workspace in Finder" path={data.status.workspace} />
      ) : null}
      <Action.OpenInBrowser title="Open Fx CLI Documentation" url="https://fx.sh/docs/using-fx/cli" />
    </ActionPanel>
  );
}

function overviewDetail(status: FxStatusResponse, doctor: FxDoctorResponse) {
  return (
    <List.Item.Detail
      markdown={summaryMarkdown(status, doctor)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Checks">
            <List.Item.Detail.Metadata.TagList.Item text={`${doctor.ok_count || 0} passed`} color={Color.Green} />
            {doctor.warn_count ? (
              <List.Item.Detail.Metadata.TagList.Item text={`${doctor.warn_count} warning`} color={Color.Orange} />
            ) : null}
            {doctor.fail_count ? (
              <List.Item.Detail.Metadata.TagList.Item text={`${doctor.fail_count} failed`} color={Color.Red} />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Model"
            text={status.model || doctor.model || "Unknown"}
            icon={Icon.Stars}
          />
          {status.model_source || doctor.model_source ? (
            <List.Item.Detail.Metadata.Label
              title="Model Source"
              text={status.model_source || doctor.model_source || ""}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Authentication"
            text={status.auth || doctor.auth || "Unknown"}
            icon={Icon.Key}
          />
          <List.Item.Detail.Metadata.Label
            title="Permissions"
            text={status.permission_mode || doctor.permission_mode || "Unknown"}
            icon={Icon.Lock}
          />
          <List.Item.Detail.Metadata.Label
            title="Workspace"
            text={status.workspace || doctor.workspace || "Unknown"}
            icon={Icon.Folder}
          />
          {status.connected_providers?.length ? (
            <List.Item.Detail.Metadata.Label title="Providers" text={status.connected_providers.join(", ")} />
          ) : null}
          {status.build_revision ? (
            <List.Item.Detail.Metadata.Label title="Build" text={status.build_revision} />
          ) : null}
          {status.update_channel ? (
            <List.Item.Detail.Metadata.Label title="Update Channel" text={status.update_channel} />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function checkDetail(check: FxDoctorCheck) {
  const appearance = checkAppearance(check.status);
  return (
    <List.Item.Detail
      markdown={`# ${markdownEscape(titleCase(check.name))}\n\n${markdownEscape(check.detail || "fx did not provide additional details for this check.")}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Result">
            <List.Item.Detail.Metadata.TagList.Item text={appearance.label} color={appearance.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Check" text={check.name} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { fxPath, defaultWorkspace } = getFxPreferences();
  const workspace = defaultWorkingDirectory(defaultWorkspace);
  const { data, error, isLoading, revalidate } = usePromise(
    async () => {
      const [status, doctor] = await Promise.all([
        runFxJson<FxStatusResponse>(fxPath, ["status", "--json"], { cwd: workspace }),
        runFxJson<FxDoctorResponse>(fxPath, ["doctor", "--json"], { cwd: workspace }),
      ]);
      return { status, doctor };
    },
    [],
    { failureToastOptions: { title: "Could Not Check fx" } },
  );

  const actions = data ? <HealthActions data={data} revalidate={revalidate} /> : undefined;
  const checks = data?.doctor.checks || [];

  return (
    <List isLoading={isLoading} isShowingDetail={Boolean(data)} searchBarPlaceholder="Search fx health checks…">
      {error ? (
        <List.EmptyView
          title="Could Not Check fx"
          description={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={<FxErrorActions error={error} retry={revalidate} />}
        />
      ) : data ? (
        <>
          <List.Section title="Overview">
            <List.Item
              title={
                data.doctor.fail_count
                  ? "fx Needs Attention"
                  : data.doctor.warn_count
                    ? "fx Has Warnings"
                    : "fx Is Healthy"
              }
              subtitle={`${data.doctor.ok_count || 0} passed · ${data.doctor.warn_count || 0} warnings · ${data.doctor.fail_count || 0} failed`}
              icon={{
                source: data.doctor.fail_count
                  ? Icon.XMarkCircle
                  : data.doctor.warn_count
                    ? Icon.ExclamationMark
                    : Icon.CheckCircle,
                tintColor: data.doctor.fail_count ? Color.Red : data.doctor.warn_count ? Color.Orange : Color.Green,
              }}
              accessories={[{ tag: data.status.model || data.doctor.model || "Unknown model" }]}
              detail={overviewDetail(data.status, data.doctor)}
              actions={actions}
            />
          </List.Section>
          <List.Section title="Health Checks" subtitle={`${checks.length}`}>
            {checks.map((check, index) => {
              const appearance = checkAppearance(check.status);
              return (
                <List.Item
                  key={`${check.name}-${index}`}
                  title={titleCase(check.name)}
                  subtitle={check.detail}
                  icon={{ source: appearance.icon, tintColor: appearance.color }}
                  accessories={[{ tag: { value: appearance.label, color: appearance.color } }]}
                  detail={checkDetail(check)}
                  actions={actions}
                />
              );
            })}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
