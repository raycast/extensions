import * as React from "react";
import { Action, ActionPanel, Color, Icon, List, open, LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GetModels } from "../function";

export function ModelView(): JSX.Element {
  const { data: Models, isLoading } = usePromise(GetModels);
  const [showDetail, setShowDetail] = React.useState(true);

  function ModelDetail(m: {
    name: string;
    summary?: string;
    url?: string;
    meta?: Record<string, string | number | string[]>;
  }): JSX.Element {
    const meta = m.meta || {};
    return (
      <List.Item.Detail
        markdown={m.summary ? m.summary : undefined}
        metadata={
          <List.Item.Detail.Metadata>
            {m.url && <List.Item.Detail.Metadata.Link title="Documentation" text={m.url} target={m.url} />}
            {Object.entries(meta).map(([k, v]) => (
              <List.Item.Detail.Metadata.Label key={k} title={k} text={Array.isArray(v) ? v.join(", ") : String(v)} />
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      actions={
        <ActionPanel>
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowDetail((s) => !s)}
          />
        </ActionPanel>
      }
    >
      {Models &&
        Models.get("GitHub") &&
        Models.get("GitHub")!.map((m) => (
          <List.Item
            key={m.name}
            title={m.name}
            icon={Icon.Box}
            accessories={m.capabilities?.map((c) => ({ tag: { value: c, color: Color.Purple } }))}
            detail={<ModelDetail name={m.name} summary={m.summary} url={m.url} meta={m.meta} />}
            actions={
              <ActionPanel>
                <Action title="Open Docs" icon={Icon.Globe} onAction={() => m.url && open(m.url)} />
                <Action
                  title="Set as Default Model"
                  icon={Icon.Star}
                  onAction={async () => {
                    await LocalStorage.setItem("github_default_model", m.name);
                    await showToast({ style: Toast.Style.Success, title: "Default model set", message: m.name });
                  }}
                />
                <Action
                  title={showDetail ? "Hide Detail" : "Show Detail"}
                  icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => setShowDetail((s) => !s)}
                />
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && Models && (!Models.get("GitHub") || Models.get("GitHub")!.length === 0) && (
        <List.EmptyView
          icon={Icon.Xmark}
          title="No Models Found"
          description="Run Sync GitHub Models or check token."
        />
      )}
    </List>
  );
}
