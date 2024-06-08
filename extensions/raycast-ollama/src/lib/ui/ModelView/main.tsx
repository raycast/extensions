import * as Types from "./types";
import * as React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { DeleteModel, DeleteServer, GetModels, GetServerArray } from "./function";
import { FormPullModel } from "./form/PullModel";
import { FormEditServer } from "./form/EditServer";
import { GetOllamaServers } from "../../settings/settings";

/**
 * Return JSX element for managing Ollama models.
 * @returns {JSX.Element} Raycast Model View.
 */
export function ModelView(): JSX.Element {
  const [SelectedServer, setSelectedServer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("Local");
  const { data: Servers, isLoading: IsLoadingServers, revalidate: RevalidateServers } = usePromise(GetServerArray);
  const { data: ServersSettings, revalidate: RevalidateServersSettings } = usePromise(GetOllamaServers);
  const {
    data: Models,
    isLoading: IsLoadingModels,
    revalidate: RevalidateModels,
  } = usePromise(GetModels, [SelectedServer]);
  const [Download, setDownload]: [
    Types.UiModelDownload[],
    React.Dispatch<React.SetStateAction<Types.UiModelDownload[]>>
  ] = React.useState([] as Types.UiModelDownload[]);
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

  /**
   * Model Detail.
   * @param model
   * @returns List.Item.Detail
   */
  function ModelDetail(prop: { model: Types.UiModel }): JSX.Element {
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
              title="Modified At"
              icon={Icon.Calendar}
              text={prop.model.detail.modified_at}
            />
            <List.Item.Detail.Metadata.Label
              title="Size"
              icon={Icon.HardDrive}
              text={`${(prop.model.detail.size / 1e9).toPrecision(2).toString()} GB`}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="System Prompt" text={prop.model.show.system} />
            <List.Item.Detail.Metadata.Label title="Template" text={prop.model.show.template} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Parameters">
              {Object.keys(prop.model.modelfile.parameter).map((p, i) => (
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${p} ${prop.model.modelfile && Object.values(prop.model.modelfile?.parameter)[i]}`}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="License" text={prop.model.show.license} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  /**
   * Model Action Menu.
   * @param model
   * @returns ActionPanel
   */
  function ModelAction(prop: { model: Types.UiModel }): JSX.Element {
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
          <Action
            title="Pull Model"
            icon={Icon.Download}
            onAction={() => setShowPullModelForm(true)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <ActionPanel.Submenu title="Delete Model" icon={Icon.Trash}>
            <Action
              title={`Yes, Delete "${prop.model.detail.name}" Model`}
              icon={Icon.Trash}
              onAction={() => DeleteModel(prop.model, RevalidateModels)}
            />
            <Action title="No" icon={Icon.XMarkCircle} />
          </ActionPanel.Submenu>
        </ActionPanel.Section>
        <ActionPanel.Section title="Ollama Server">
          <Action title="Add Server" icon={Icon.NewDocument} onAction={() => setShowNewServerForm(true)} />
          {SelectedServer !== "All" && SelectedServer !== "Local" && (
            <Action title="Edit Server" icon={Icon.Pencil} onAction={() => setShowEditServerForm(true)} />
          )}
          {SelectedServer !== "All" && SelectedServer !== "Local" && (
            <ActionPanel.Submenu title="Delete Server" icon={Icon.DeleteDocument}>
              <Action
                title={`Yes, Delete "${prop.model.server.name}" Server`}
                icon={Icon.CheckCircle}
                onAction={() => DeleteServer(SelectedServer, RevalidateServers, setSelectedServer)}
              />
              <Action title="No" icon={Icon.XMarkCircle} />
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (!IsLoadingServers && SelectedServer) RevalidateModels();
  }, [SelectedServer, IsLoadingServers]);

  React.useEffect(() => {
    if (!IsLoadingServers && Servers) RevalidateServersSettings();
  }, [IsLoadingServers, Servers]);

  const [showPullModelForm, setShowPullModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [showNewServerForm, setShowNewServerForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [showEditServerForm, setShowEditServerForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  if (Servers && showPullModelForm)
    return (
      <FormPullModel
        setShow={setShowPullModelForm}
        setDownload={setDownload}
        revalidate={RevalidateModels}
        servers={Servers.filter((s) => s !== "All")}
        selectedServer={SelectedServer}
      />
    );

  if (Servers && showNewServerForm)
    return <FormEditServer setShow={setShowNewServerForm} revalidate={RevalidateServers} servers={Servers} />;

  if (Servers && ServersSettings && showEditServerForm)
    return (
      <FormEditServer
        setShow={setShowEditServerForm}
        revalidate={RevalidateServers}
        servers={Servers}
        server={ServersSettings.get(SelectedServer)}
        name={SelectedServer}
      />
    );

  return (
    <List
      isLoading={IsLoadingModels || IsLoadingServers}
      isShowingDetail={showDetail}
      searchBarAccessory={SearchBarAccessory()}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Ollama Model">
            <Action
              title="Pull Model"
              icon={Icon.Download}
              onAction={() => setShowPullModelForm(true)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Ollama Server">
            <Action title="Add Server" icon={Icon.NewDocument} onAction={() => setShowNewServerForm(true)} />
            {SelectedServer !== "All" && SelectedServer !== "Local" && (
              <Action title="Edit Server" icon={Icon.Pencil} onAction={() => setShowEditServerForm(true)} />
            )}
            {SelectedServer !== "All" && SelectedServer !== "Local" && (
              <Action
                title="Delete Server"
                icon={Icon.DeleteDocument}
                onAction={() => DeleteServer(SelectedServer, RevalidateServers, setSelectedServer)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
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
              accessories={SelectedServer === "All" ? [{ tag: item.server.name, icon: Icon.HardDrive }] : []}
            />
          );
        })}
      {Download.map((d) => {
        if (d.server === SelectedServer || SelectedServer === "All")
          return (
            <List.Item
              title={d.name}
              icon={getProgressIcon(d.download)}
              key={`${d.server}_${d.name}_download`}
              id={`${d.server}_${d.name}_download`}
              accessories={SelectedServer === "All" ? [{ tag: d.server, icon: Icon.HardDrive }] : []}
            />
          );
      })}
    </List>
  );
}
