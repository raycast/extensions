import { OllamaApiTags, OllamaApiDelete, OllamaApiPull, OllamaApiShow, OllamaApiShowParseModelfile } from "../ollama";
import {
  OllamaApiShowModelfile,
  OllamaApiShowResponse,
  OllamaApiTagsResponse,
  OllamaApiTagsResponseModel,
} from "../types";
import * as React from "react";
import { Form, Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";

/**
 * Return JSX element for managing Ollama models.
 * @returns {JSX.Element} Raycast Model View.
 */
export function ModelView(): JSX.Element {
  const {
    data: InstalledModels,
    isLoading: IsLoadingInstalledModels,
    revalidate: RevalidateInstalledModels,
  } = usePromise(OllamaApiTags, [], {
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const {
    data: InstalledModelsShow,
    isLoading: IsLoadingInstalledModelsShow,
    revalidate: RevalidateInstalledModelsShow,
  } = usePromise(GetInstalledModelsShow, [InstalledModels], {
    execute: false,
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const [Download, setDownload]: [Map<string, number>, React.Dispatch<React.SetStateAction<Map<string, number>>>] =
    React.useState(new Map());
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  /**
   * Retrive detail from each model tag.
   * @param {OllamaApiTagsResponse | undefined} tags
   * @returns {Promise<Map<string, OllamaApiShowResponse>>}
   */
  async function GetInstalledModelsShow(
    tags: OllamaApiTagsResponse | undefined
  ): Promise<Map<string, OllamaApiShowResponse>> {
    const map: Map<string, OllamaApiShowResponse> = new Map();

    if (tags)
      tags.models.forEach(async (tag) => {
        const show = await OllamaApiShow(tag.name);
        map.set(tag.name, show);
      });

    return map;
  }

  /**
   * Delete Model
   * @param {string} name
   */
  function deleteModel(name: string): void {
    OllamaApiDelete(name)
      .then(async () => {
        RevalidateInstalledModels();
        await showToast({ style: Toast.Style.Success, title: "Model Deleted." });
      })
      .catch(async (err) => await showToast({ style: Toast.Style.Failure, title: err.message }));
  }

  /**
   * Pull Model
   * @param {string} name
   */
  async function pullModel(name: string): Promise<void> {
    const e = await OllamaApiPull(name).catch(async (err): Promise<undefined> => {
      await showToast({ style: Toast.Style.Failure, title: err.message });
      return undefined;
    });

    if (e) {
      setShowPullModelForm(false);
      e.on("message", async (data) => {
        await showToast({ style: Toast.Style.Animated, title: data });
      });
      e.on("downloading", (data: number) => {
        if (!Download.has(name)) setDownload((prevState) => new Map(prevState.set(name, data)));
        const currentDownload = data.toFixed(2);
        if (currentDownload !== Download.get(name)?.toFixed(2))
          setDownload((prevState) => new Map(prevState.set(name, data)));
      });
      e.on("done", async () => {
        RevalidateInstalledModels();
        setDownload((prevState) => {
          prevState.delete(name);
          return new Map(prevState);
        });
        await showToast({ style: Toast.Style.Success, title: "Model Downloaded." });
      });
      e.on("error", async (data) => {
        setDownload((prevState) => {
          prevState.delete(name);
          return new Map(prevState);
        });
        await showToast({ style: Toast.Style.Failure, title: data });
      });
    }
  }

  /**
   * Model Detail.
   * @param {OllamaApiTagsResponseModel} props.tags
   * @param {Map<string, OllamaApiShowResponse> | undefined} props.show
   * @returns {JSX.Element}
   */
  function ModelDetail(prop: {
    tag: OllamaApiTagsResponseModel;
    show: Map<string, OllamaApiShowResponse> | undefined;
  }): JSX.Element {
    let show: OllamaApiShowResponse | undefined = undefined;
    let modelfile: OllamaApiShowModelfile | undefined;

    if (prop.show) show = prop.show.get(prop.tag.name);
    if (show) modelfile = OllamaApiShowParseModelfile(show);

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Format" text={prop.tag.details.format} />
            <List.Item.Detail.Metadata.Label title="Family" text={prop.tag.details.family} />
            {prop.tag.details.families && prop.tag.details.families.length > 0 && (
              <List.Item.Detail.Metadata.TagList title="Families">
                {prop.tag.details.families.map((f) => (
                  <List.Item.Detail.Metadata.TagList.Item text={f} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
            <List.Item.Detail.Metadata.Label title="Parameter Size" text={prop.tag.details.parameter_size} />
            <List.Item.Detail.Metadata.Label title="Quantization Level" text={prop.tag.details.quantization_level} />
            <List.Item.Detail.Metadata.Label title="Modified At" icon={Icon.Calendar} text={prop.tag.modified_at} />
            <List.Item.Detail.Metadata.Label
              title="Size"
              icon={Icon.HardDrive}
              text={`${(prop.tag.size / 1e9).toPrecision(2).toString()} GB`}
            />
            <List.Item.Detail.Metadata.Separator />
            {show && <List.Item.Detail.Metadata.Label title="System Prompt" text={show.system} />}
            {show && <List.Item.Detail.Metadata.Label title="Template" text={show.template} />}
            <List.Item.Detail.Metadata.Separator />
            {modelfile && (
              <List.Item.Detail.Metadata.TagList title="Parameters">
                {Object.keys(modelfile.parameter).map((p, i) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${p} ${modelfile && Object.values(modelfile?.parameter)[i]}`}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
            <List.Item.Detail.Metadata.Separator />
            {show && <List.Item.Detail.Metadata.Label title="License" text={show.license} />}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  /**
   * Model Action Menu.
   * @param {OllamaApiTagsResponseModel} props.model
   * @returns {JSX.Element}
   */
  function ModelAction(prop: { model: OllamaApiTagsResponseModel }): JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama">
          {InstalledModels && InstalledModelsShow && (
            <Action
              title={showDetail ? "Hide Detail" : "Show Detail"}
              icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setShowDetail((prevState) => !prevState)}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          )}
          <Action.CopyToClipboard title="Copy Model Name" content={prop.model.name as string} />
          <Action title="Pull Model" icon={Icon.Download} onAction={() => setShowPullModelForm(true)} />
          <Action title="Delete Model" icon={Icon.Trash} onAction={() => deleteModel(prop.model.name)} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (InstalledModels) RevalidateInstalledModelsShow();
  }, [InstalledModels]);

  const [showPullModelForm, setShowPullModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  if (showPullModelForm)
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Pull Model"
              onSubmit={async (values) => {
                await pullModel(values.model);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="model" title="Model Name" placeholder="Model Name" />
      </Form>
    );

  return (
    <List
      isLoading={IsLoadingInstalledModels || IsLoadingInstalledModelsShow}
      isShowingDetail={showDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Ollama">
            <Action title="Pull Model" icon={Icon.Download} onAction={() => setShowPullModelForm(true)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {InstalledModels &&
        InstalledModels.models.map((item) => {
          return (
            <List.Item
              title={item.name}
              icon={Icon.Box}
              key={item.name}
              id={item.name}
              actions={<ModelAction model={item} />}
              detail={<ModelDetail tag={item} show={InstalledModelsShow} />}
            />
          );
        })}
      {[...Download.keys()].map((d) => {
        return <List.Item title={d} icon={getProgressIcon(Download.get(d) as number)} key={d} id={d} />;
      })}
    </List>
  );
}
