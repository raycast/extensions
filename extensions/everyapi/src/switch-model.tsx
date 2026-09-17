import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { EveryApi, type ModelInfo } from "./lib/api";
import type { AuthSession } from "./lib/auth";
import { HttpClient } from "./lib/http";
import { availableModels } from "./lib/model-availability";
import { groupModels, normalizeModels } from "./lib/models";
import { providerIcon } from "./lib/provider-icons";
import { AuthGate } from "./lib/use-auth";
import { useDefaultModel } from "./lib/use-cached-model";
import { apiBase, gatewayOrigin } from "./lib/url";

function formatContext(model: ModelInfo): string | undefined {
  if (!model.context_length) return undefined;
  return `${Math.round(model.context_length / 1000)}k context`;
}

function ModelList({
  origin,
  session,
}: {
  origin: string;
  session: AuthSession;
}) {
  const { model: currentDefault, setModel, loaded } = useDefaultModel();
  const api = useMemo(
    () => new EveryApi(new HttpClient({ origin, auth: session })),
    [origin, session],
  );
  const { data, isLoading, revalidate } = usePromise(async () =>
    availableModels((await api.models()).data),
  );
  const groups = groupModels(normalizeModels(data ?? []));

  return (
    <List
      isLoading={isLoading || !loaded}
      searchBarPlaceholder="Search models — Claude, GPT, Gemini, DeepSeek…"
      navigationTitle="EveryAPI · Default Model"
    >
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Models Available"
          description="EveryAPI did not return a model catalog for this account."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {groups.map((group) => (
        <List.Section key={group.provider} title={group.provider}>
          {group.models.map((model) => (
            <List.Item
              key={model.id}
              title={model.id}
              subtitle={formatContext(model)}
              icon={providerIcon(group.provider) ?? Icon.Network}
              accessories={
                model.id === currentDefault
                  ? [{ tag: { value: "Default", color: Color.Green } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default"
                    icon={Icon.Star}
                    onAction={async () => {
                      await setModel(model.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Default Model Set",
                        message: model.id,
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Model ID"
                    content={model.id}
                    icon={Icon.Clipboard}
                  />
                  <Action
                    title="Refresh Models"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function SwitchModel() {
  const preferences = getPreferenceValues<Preferences>();
  const origin = gatewayOrigin(preferences.baseUrl);
  return (
    <AuthGate apiBase={apiBase(origin)}>
      {({ session }) => <ModelList origin={origin} session={session} />}
    </AuthGate>
  );
}
