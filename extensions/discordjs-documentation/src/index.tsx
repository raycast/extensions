import { Action, ActionPanel, Detail, List, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";

import {
  Doc,
  DocElement,
  DocEvent,
  DocMethod,
  DocParam,
  DocProp,
  DocTypes,
  SourcesStringUnion,
} from "discordjs-docs-parser";

import { useEffect, useState } from "react";

function getDocList(doc: Doc) {
  const docList = [];
  for (const [, value] of doc.children) {
    if (value.access !== "private") {
      docList.push(value);
    }
  }
  return docList;
}

export default function Command() {
  const [state, setState] = useState<{ doc?: Doc }>({});
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [docSource, setDocSource] = useState<SourcesStringUnion | null>(null);
  const [list, setList] = useState<(DocEvent | DocMethod | DocParam | DocProp)[]>([]);

  const { push } = useNavigation();
  useEffect(() => {
    async function getDocs() {
      setLoading(true);
      try {
        const source = await LocalStorage.getItem("doc-source");
        if (source !== docSource) {
          return setDocSource(source as SourcesStringUnion);
        }

        const doc = await Doc.fetch(docSource ? docSource : (source as SourcesStringUnion) ?? "stable", {
          force: true,
        });
        setState({ doc });
        setList(getDocList(doc));
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error("Something went wrong"));
      }
    }
    getDocs();
  }, [docSource]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={(!state?.doc && !error) || loading}
      searchBarAccessory={<DocDropDown setDocType={setDocSource} docType={docSource} />}
      searchBarPlaceholder={"Search..."}
    >
      {list.map((item, index) => (
        <List.Item
          key={item.name + index.toString()}
          title={item.formattedName ?? ""}
          subtitle={item.formattedDescription ?? ""}
          actions={
            <ActionPanel>
              <Action
                title={`${item.props?.length ? "See Methods and Properties" : "See Info"}`}
                onAction={() => push(<DetailPanel item={item} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DocDropDown({
  setDocType,
  docType,
}: {
  setDocType: (x: SourcesStringUnion) => void;
  docType: SourcesStringUnion | null;
}) {
  return (
    <List.Dropdown
      tooltip="Select Documentation Source"
      value={docType ?? "stable"}
      onChange={(val) => {
        setDocType(val as SourcesStringUnion);
        LocalStorage.setItem("doc-source", val);
      }}
    >
      <List.Dropdown.Item key="stable" title="Stable Branch" value="stable" />
      <List.Dropdown.Item key="main" value="main" title="Dev Branch" />
      <List.Dropdown.Item key="collection" value="collection" title="Collection" />
      <List.Dropdown.Item key="builders" value="builders" title="Builders" />
      <List.Dropdown.Item key="voice" value="voice" title="Voice" />
      <List.Dropdown.Item key="rpc" value="rpc" title="RPC" />
    </List.Dropdown>
  );
}

function DetailPanel(props: { item: DocElement }) {
  const { push } = useNavigation();
  const { item } = props;
  if (item.props?.length) {
    return (
      <List navigationTitle={item.formattedName} searchBarPlaceholder={`Search properties and methods`}>
        {...item.props
          .filter((x) => !x.name?.startsWith("_"))
          .sort((a, b) => a.formattedName.localeCompare(b.formattedName))
          .map((prop) => (
            <List.Item
              actions={
                <ActionPanel>
                  <Action title={"See Info"} onAction={() => push(<DetailPanel item={prop} />)} />
                </ActionPanel>
              }
              key={prop.formattedName}
              title={`.${prop.name}`}
              subtitle={prop.description ?? ""}
            />
          ))}
        {item.methods?.length &&
          item.methods
            .filter((x) => x.access === "public")
            .map((method) => (
              <List.Item
                actions={
                  <ActionPanel>
                    <Action title={"See info"} onAction={() => push(<DetailPanel item={method} />)} />
                  </ActionPanel>
                }
                key={method.formattedName}
                title={`.${method.name}(${
                  method.params?.length ? method.params.map((param) => param.name).join(", ") : ""
                })`}
                subtitle={method.description ?? ""}
              />
            ))}
      </List>
    );
  }
  const propTypes: Record<DocTypes, string> = {
    prop: "Property",
    method: "Method",
    class: "Class",
    event: "Event",
    interface: "Interface",
    param: "Param",
    typedef: "TypeDef",
  };
  return (
    <Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Tags">
            {item.deprecated ? <Detail.Metadata.TagList.Item color="red" text={"Deprecated"} /> : null}

            {item.docType ? <Detail.Metadata.TagList.Item color="yellow" text={propTypes[item.docType]} /> : null}

            {item.nullable ? <Detail.Metadata.TagList.Item color="purple" text={"Nullable"} /> : null}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      markdown={item.docType === "method" ? getMethodDetails(item) : getPropDetails(item)}
    />
  );
}

function getMethodDetails(item: DocMethod) {
  return `# ${item.name}(${item.params?.length ? item.params.map((param) => param.name).join(", ") : ""})

${item.formattedDescription.split("\n").join("\n\n")}

${item.deprecated ? item.deprecated : ""}

${item.type?.length ? `**Type:** ${item.type?.join("")}` : ""}


${
  item.params?.length
    ? `**Parameters:** 

${item.params
  .map((param) => {
    return `\`${param.name}\` \n\n- **Type:** ${
      param.type
        ?.map((x) => {
          if (["Buffer", "string", "number", "boolean"].includes(x)) return x;
          return `[${x}](https://discord.js.org/#/docs/discord.js/stable/typedef/${x})`;
        })
        .join(", ") ?? ""
    } ${param.description ? `\n\n- **Description:** ${param.description}` : ""}`;
  })
  .join("\n\n")}`
    : ""
}


${
  item.returns
    ? Array.isArray(item.returns)
      ? `**Returns:** ${item.returns.flat(3).join("")}`
      : `**Returns:** ${item.returns.types.flat(3).join("")}`
    : ""
}

${item.examples?.length ? `**Examples:**\n\n${item.examples.map((x) => "```js\n" + x + "\n```").join("\n\n")}` : ""}
      `;
}

function getPropDetails(item: DocElement) {
  return `# ${item.formattedName}

${item.formattedDescription.split("\n").join("\n\n")}

${item.deprecated ? item.deprecated : ""}

${item.type?.length ? `**Type:** ${item.type?.join("")}` : ""}

${
  item.returns
    ? Array.isArray(item.returns)
      ? `**Returns:** ${item.returns.flat(4).join("")}`
      : `**Returns:** ${item.returns.types.flat(4).join("")}`
    : ""
}
      `;
}
