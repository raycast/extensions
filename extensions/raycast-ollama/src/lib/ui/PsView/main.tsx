import * as Types from "./types";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React from "react";
import { FormatOllamaPsModelExpireAtFormat, GetServerArray } from "../function";
import { GetModels } from "./function";

export function PsView(): React.JSX.Element {
  const [SelectedServer, setSelectedServer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("Local");
  const { data: Servers, isLoading: IsLoadingServers } = usePromise(GetServerArray);
  const {
    data: Models,
    isLoading: IsLoadingModels,
    revalidate: RevalidateModels,
  } = usePromise(GetModels, [SelectedServer]);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  function SearchBarAccessory(): JSX.Element {
    return (
      <List.Dropdown
        tooltip="Available Server"
        onChange={setSelectedServer}
        defaultValue={SelectedServer ? SelectedServer : "Local"}
      >
        {Servers && Servers.map((s) => <List.Dropdown.Item title={s} value={s} />)}
      </List.Dropdown>
    );
  }

  function ModelAction(prop: { model: Types.UiModel }): React.JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama Model">
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowDetail((prevState) => !prevState)}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          <Action.CopyToClipboard title="Copy Model Name" content={prop.model.detail.name as string} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function ModelDetail(prop: { model: Types.UiModel }): React.JSX.Element {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Format" text={prop.model.detail.details.format} />
            <List.Item.Detail.Metadata.Label title="Family" text={prop.model.detail.details.family} />
            {prop.model.detail.details.families && prop.model.detail.details.families.length > 0 && (
              <List.Item.Detail.Metadata.TagList title="Families">
                {prop.model.detail.details.families.map((f) => (
                  <List.Item.Detail.Metadata.TagList.Item text={f} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
            <List.Item.Detail.Metadata.Label title="Parameter Size" text={prop.model.detail.details.parameter_size} />
            <List.Item.Detail.Metadata.Label
              title="Quantization Level"
              text={prop.model.detail.details.quantization_level}
            />
            <List.Item.Detail.Metadata.Label
              title="Size"
              icon={Icon.HardDrive}
              text={`${(prop.model.detail.size / 1e9).toPrecision(2).toString()} GB`}
            />
            <List.Item.Detail.Metadata.Label
              title="Expires at"
              icon={Icon.Hourglass}
              text={prop.model.detail.expires_at}
            />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function ModelAccessories(SelectedServer: string, Model: Types.UiModel) {
    const accessories = [];

    if (SelectedServer === "All") accessories.push({ tag: Model.server.name, icon: Icon.HardDrive });
    if (Model.detail.size_vram)
      accessories.push({
        tag: { color: Color.PrimaryText, value: `${(Model.detail.size_vram / 1e9).toPrecision(2).toString()} GB` },
        icon: Icon.MemoryChip,
      });
    if (Model.detail.expires_at)
      accessories.push({
        tag: { color: Color.PrimaryText, value: FormatOllamaPsModelExpireAtFormat(Model.detail.expires_at) },
        icon: Icon.Hourglass,
      });

    return accessories;
  }

  React.useEffect(() => {
    if (!IsLoadingServers && SelectedServer) RevalidateModels();
  }, [SelectedServer, IsLoadingServers]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      RevalidateModels();
    }, 3000);
    return () => clearInterval(interval);
  }, [Models]);

  return (
    <List
      isLoading={IsLoadingModels || IsLoadingServers}
      isShowingDetail={showDetail}
      searchBarAccessory={SearchBarAccessory()}
    >
      {Models &&
        Models.map((item) => {
          return (
            <List.Item
              title={item.detail.name}
              icon={Icon.Box}
              key={`${item.server.name}_${item.detail.name}`}
              id={`${item.server.name}_${item.detail.name}`}
              actions={<ModelAction model={item} />}
              detail={<ModelDetail model={item} />}
              accessories={ModelAccessories(SelectedServer, item)}
            />
          );
        })}
    </List>
  );
}
