import { OllamaApiTags, OllamaApiDelete, OllamaApiPull, OllamaApiShow, OllamaApiShowParseModelfile } from "../ollama";
import {
  OllamaApiTagsExtended,
  OllamaApiTagsModelExtended,
  OllamaApiTagsResponse,
  OllamaApiTagsResponseModel,
} from "../types";
import * as React from "react";
import { Form, Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

/**
 * Return JSX element for managing Ollama models.
 * @returns {JSX.Element} Raycast Model View.
 */
export function ModelView(): JSX.Element {
  const ModelsOnRegistry: string[] = [] as string[];
  const [Models, setModels]: [
    OllamaApiTagsExtended | undefined,
    React.Dispatch<React.SetStateAction<OllamaApiTagsExtended | undefined>>
  ] = React.useState();
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showForm, setShowForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  async function fetchAvailableModels(): Promise<void> {
    setIsLoading(true);
    const models = await OllamaApiTags()
      .then(async (models): Promise<OllamaApiTagsExtended> => {
        const info = models.models.map(async (model): Promise<OllamaApiTagsModelExtended> => {
          const show = await OllamaApiShow(model.name)
            .then((data) => OllamaApiShowParseModelfile(data))
            .catch(() => undefined);
          return {
            name: model.name,
            size: model.size,
            modified_at: model.modified_at,
            download: model.download,
            modelfile: show,
          } as OllamaApiTagsModelExtended;
        });
        return { models: await Promise.all(info) } as OllamaApiTagsExtended;
      })
      .catch(async (err) => {
        await showToast({ style: Toast.Style.Failure, title: err.message });
      });
    if (models) setModels(models);
    setIsLoading(false);
  }

  function deleteModel(name: string): void {
    OllamaApiDelete(name)
      .then(async () => {
        await fetchAvailableModels();
        await showToast({ style: Toast.Style.Success, title: "Model Deleted." });
      })
      .catch(async (err) => await showToast({ style: Toast.Style.Failure, title: err.message }));
  }

  async function pullModel(name: string): Promise<void> {
    const e = await OllamaApiPull(name).catch(async (err): Promise<undefined> => {
      await showToast({ style: Toast.Style.Failure, title: err.message });
      return undefined;
    });

    if (e) {
      let index: number | undefined;
      setShowForm(false);
      setModels((prevState) => {
        index = prevState?.models.push({ name: name, size: 0, modified_at: "" });
        index = (index as number) - 1;
        return prevState;
      });
      e.on("message", async (data) => {
        await showToast({ style: Toast.Style.Animated, title: data });
      });
      e.on("downloading", (data: number) => {
        const prevDownload = Models?.models[index as number].download?.toFixed(2);
        const currentDownload = data.toFixed(2);
        if (currentDownload !== prevDownload)
          setModels((prevState) => {
            const newState = prevState;
            if (newState?.models[index as number]) newState.models[index as number].download = Number(currentDownload);
            return { ...prevState, ...(newState as OllamaApiTagsResponse) };
          });
      });
      e.on("done", async () => {
        await fetchAvailableModels();
        await showToast({ style: Toast.Style.Success, title: "Model Downloaded." });
      });
      e.on("error", async (data) => {
        await fetchAvailableModels();
        await showToast({ style: Toast.Style.Failure, title: data });
      });
    }
  }

  function ModelDetail(item: OllamaApiTagsModelExtended): JSX.Element {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Model Name" icon={Icon.Box} text={item.name} />
            <List.Item.Detail.Metadata.Label
              title="Model Size"
              icon={Icon.HardDrive}
              text={`${(item.size / 1e9).toPrecision(2).toString()} GB`}
            />
            <List.Item.Detail.Metadata.Label title="Model Modified At" icon={Icon.Calendar} text={item.modified_at} />
            {item.modelfile ? <List.Item.Detail.Metadata.Separator /> : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="FROM" icon={Icon.Box} text={item.modelfile.from} />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER mirostat"
                text={String(item.modelfile.parameter.mirostat)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER mirostat_eta"
                text={String(item.modelfile.parameter.mirostat_eta)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER mirostat_tau"
                text={String(item.modelfile.parameter.mirostat_tau)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER num_ctx"
                text={String(item.modelfile.parameter.num_ctx)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER num_gpu"
                text={String(item.modelfile.parameter.num_gpu)}
              />
            ) : null}
            {item.modelfile?.parameter.num_thread ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER num_thread"
                text={String(item.modelfile.parameter.num_thread)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER repeat_last_n"
                text={String(item.modelfile.parameter.repeat_last_n)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER repeat_penalty"
                text={String(item.modelfile.parameter.repeat_penalty)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER temperature"
                text={String(item.modelfile.parameter.temperature)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="PARAMETER seed" text={String(item.modelfile.parameter.seed)} />
            ) : null}
            {item.modelfile
              ? item.modelfile.parameter.stop.map((item, index) => (
                  <List.Item.Detail.Metadata.Label
                    key={"PARAMETER stop " + index}
                    title="PARAMETER stop"
                    text={String(item)}
                  />
                ))
              : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="PARAMETER tfs_z" text={String(item.modelfile.parameter.tfs_z)} />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label
                title="PARAMETER num_predict"
                text={String(item.modelfile.parameter.num_predict)}
              />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="PARAMETER top_k" text={String(item.modelfile.parameter.top_k)} />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="PARAMETER top_p" text={String(item.modelfile.parameter.top_p)} />
            ) : null}
            {item.modelfile ? (
              <List.Item.Detail.Metadata.Label title="TEMPLATE" text={String(item.modelfile.template)} />
            ) : null}
            {item.modelfile?.system ? (
              <List.Item.Detail.Metadata.Label title="SYSTEM" text={String(item.modelfile.system)} />
            ) : null}
            {item.modelfile?.adapter ? (
              <List.Item.Detail.Metadata.Label title="SYSTEM_VERSION" text={String(item.modelfile.adapter)} />
            ) : null}
            {item.modelfile?.license ? (
              <List.Item.Detail.Metadata.Label title="SYSTEM_VERSION" text={String(item.modelfile.license)} />
            ) : null}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function ActionOllama(item: OllamaApiTagsResponseModel): JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama">
          <Action
            title="Toggle Detail"
            icon={Icon.Eye}
            onAction={() => setShowDetail((prevState) => !prevState)}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          <Action.CopyToClipboard
            title="Copy Model Name"
            content={item.name as string}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action title="Pull Model" icon={Icon.Download} onAction={() => setShowForm(true)} />
          <Action title="Delete Model" icon={Icon.Trash} onAction={() => deleteModel(item.name)} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    fetchAvailableModels();
  }, []);

  React.useEffect(() => {
    //if (showForm && ModelsOnRegistry.length === 0) fetchRegistry();
  }, [showForm]);

  if (showForm)
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Pull Model"
              onSubmit={async (values) => {
                await pullModel(values.Model);
              }}
            />
          </ActionPanel>
        }
      >
        {ModelsOnRegistry.length === undefined || ModelsOnRegistry.length === 0 ? (
          <Form.TextField id="Model" title="Model Name" placeholder="Model Name" />
        ) : null}
        {ModelsOnRegistry.length && ModelsOnRegistry.length > 0 ? (
          <Form.Dropdown id="Model" title="Model Name">
            {ModelsOnRegistry.map((item) => {
              return <Form.Dropdown.Item key={item} title={item} value={item} />;
            })}
          </Form.Dropdown>
        ) : null}
      </Form>
    );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Models && Models.models.length > 0 && showDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Ollama">
            <Action title="Pull Model" icon={Icon.Download} onAction={() => setShowForm(true)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {Models &&
        Models.models.map((item) => {
          return (
            <List.Item
              title={item.name}
              icon={(() => {
                if (item.download) {
                  return getProgressIcon(item.download);
                }
                return Icon.Box;
              })()}
              key={item.name}
              id={item.name}
              actions={ActionOllama(item)}
              detail={ModelDetail(item)}
            />
          );
        })}
    </List>
  );
}
