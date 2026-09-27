import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { agentIcon, modelIcon, type IconSpec } from "./lib/icons";
import type { AgentRow, ModelEntry } from "./lib/parse";
import { parseAgents, parseConfirmation, parseModels } from "./lib/parse";
import { reportMagpieError } from "./lib/report-error";
import { magpie } from "./lib/exec";
import { useMagpie } from "./lib/use-magpie";

type Preferences = { binaryPath?: string };

export default function SwitchModel() {
  const { isLoading, data, error, revalidate } = useMagpie(["ls"], parseAgents);
  useReport(error);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search agents">
      {error && !data ? (
        <List.EmptyView
          title="Couldn't list agents"
          description={error.message}
        />
      ) : data?.length === 0 ? (
        <List.EmptyView
          title="No agents"
          description="magpie did not find an installed agent."
        />
      ) : (
        data?.map((agent) => (
          <List.Item
            key={`${agent.name}-${agent.path ?? ""}`}
            icon={image(agentIcon(agent.id))}
            title={agent.name}
            subtitle={
              agent.extras
                .map((extra) => `${extra.label} ${extra.value}`)
                .join(" · ") || agent.path
            }
            accessories={[{ text: agent.model || "default" }]}
            actions={
              <ActionPanel>
                {agent.id ? (
                  <Action.Push
                    title="Choose Model"
                    icon={Icon.ArrowRight}
                    target={<ModelList agent={agent} onSwitched={revalidate} />}
                  />
                ) : (
                  <Action
                    title="Agent ID Unknown"
                    icon={Icon.ExclamationMark}
                    onAction={() =>
                      showToast({ title: `No CLI id for ${agent.name}` })
                    }
                  />
                )}
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ModelList({
  agent,
  onSwitched,
}: {
  agent: AgentRow;
  onSwitched: () => void;
}) {
  const { pop } = useNavigation();
  const { binaryPath } = getPreferenceValues<Preferences>();
  const { isLoading, data, error } = useMagpie(["models"], parseModels);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useReport(error);

  async function select(model: ModelEntry) {
    if (!agent.id || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const stdout = await magpie(binaryPath, [agent.id, model.id]);
      const note = parseConfirmation(stdout);
      await showToast({
        style: Toast.Style.Success,
        title: note.summary,
        message: note.notice,
      });
      onSwitched();
      pop();
    } catch (caught) {
      await reportMagpieError(caught);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <List
      isLoading={isLoading || busy}
      searchBarPlaceholder={`Model for ${agent.name}`}
      navigationTitle={agent.name}
    >
      {error && !data ? (
        <List.EmptyView
          title="Couldn't list models"
          description={error.message}
        />
      ) : data?.empty ? (
        <List.EmptyView
          title="No models"
          description="Add a provider with magpie provider add, then run magpie sync."
        />
      ) : (
        data?.sections.map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.models.map((model) => {
              const current = model.id === agent.model;
              return (
                <List.Item
                  key={model.id}
                  icon={image(modelIcon(model.id))}
                  title={model.name || model.id}
                  subtitle={model.name ? model.id : undefined}
                  keywords={[model.id, ...(model.efforts ?? [])]}
                  accessories={[
                    ...(current ? [{ icon: Icon.CheckCircle }] : []),
                    ...(model.efforts
                      ? [{ text: model.efforts.join(" / ") }]
                      : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Set Model"
                        icon={Icon.Check}
                        onAction={() => select(model)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

function image(spec?: IconSpec): Image.ImageLike {
  if (!spec) return Icon.Circle;
  return spec.mono
    ? { source: spec.file, tintColor: Color.PrimaryText }
    : spec.file;
}

function useReport(error: Error | undefined) {
  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);
}
