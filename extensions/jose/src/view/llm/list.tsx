import { List } from "@raycast/api";
import { ITalkLlm } from "../../ai/type";

export const LlmListView = ({
  llms,
  selectedLlm,
  actionPanel,
}: {
  llms: ITalkLlm[];
  selectedLlm: string | null;
  actionPanel: (llm: ITalkLlm) => JSX.Element;
}) => {
  return (
    <>
      {Object.entries(LlmGroupByCompany(llms) as Record<string, ITalkLlm[]>).map(([name, list]) => (
        <List.Section key={name} title={name} subtitle={list.length.toLocaleString()}>
          {list.map((llm: ITalkLlm) => (
            <LlmListItem key={llm.key} llm={llm} selectedllm={selectedLlm} actionPanel={actionPanel} />
          ))}
        </List.Section>
      ))}
    </>
  );
};

export function LlmGroupByCompany(array: ITalkLlm[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return array.reduce((acc: any, obj: ITalkLlm) => {
    const key = obj.company;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
}

export const LlmListItem = ({
  llm,
  selectedllm,
  actionPanel,
}: {
  llm: ITalkLlm;
  selectedllm: string | null;
  actionPanel: (llm: ITalkLlm) => JSX.Element;
}) => {
  return (
    <List.Item
      id={llm.key}
      key={llm.key}
      title={llm.title}
      subtitle={llm.company}
      detail={<ModelDetailView llm={llm} />}
      actions={selectedllm === llm.key ? actionPanel(llm) : undefined}
    />
  );
};

const ModelDetailView = (props: { llm: ITalkLlm; markdown?: string | null | undefined }) => {
  const { llm } = props;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={llm.title} />
          <List.Item.Detail.Metadata.Label title="Company" text={llm.company} />
          <List.Item.Detail.Metadata.Label title="Model" text={llm.model} />
          <List.Item.Detail.Metadata.Label title="Url" text={llm.url} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Local" text={llm.isLocal ? "YES" : "no"} />
          <List.Item.Detail.Metadata.Label title="ID" text={llm.key} />
          <List.Item.Detail.Metadata.Separator />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
