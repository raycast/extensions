import { OllamaApiTags, OllamaApiDelete, OllamaApiPull, OllamaAvailableModelsOnRegistry } from "./api/ollama";
import { OllamaApiTagsResponse, OllamaApiTagsResponseModel } from "./api/types";
import * as React from "react";
import { Form, Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export default function Command(): JSX.Element {
  const [ModelsOnRegistry, setModelsOnRegistry]: [string[], React.Dispatch<React.SetStateAction<string[]>>] =
    React.useState([] as string[]);
  const [Models, setModels]: [
    OllamaApiTagsResponse | undefined,
    React.Dispatch<React.SetStateAction<OllamaApiTagsResponse | undefined>>
  ] = React.useState();
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showForm, setShowForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  async function fetchAvailableModels(): Promise<void> {
    setIsLoading(true);
    await OllamaApiTags()
      .then((data) => {
        setModels(data);
        setIsLoading(false);
      })
      .catch(async (err) => await showToast({ style: Toast.Style.Failure, title: err.message }));
  }

  async function fetchRegistry(): Promise<void> {
    setIsLoading(true);
    await OllamaAvailableModelsOnRegistry()
      .then((data) => {
        setModelsOnRegistry(data);
        setIsLoading(false);
      })
      .catch(async (err) => await showToast({ style: Toast.Style.Failure, title: err.message }));
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

  function ModelDetail(item: OllamaApiTagsResponseModel): JSX.Element {
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
