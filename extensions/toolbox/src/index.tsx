import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { execa } from "execa";
import React, { useEffect, useMemo, useState } from "react";
import * as scripts from "./script";
import { Category, Info, Result, Run, RunType, Script } from "./script/type";

let selectScript: Run | null = null;

let isClipboardScriptRunning = false;

const preferences = getPreferenceValues();

export default function ToolboxList() {
  const [categorys, setCategorys] = useState<Category[]>();

  useEffect(() => {
    const categorys: Category[] = [];
    Object.entries(scripts).forEach(([categoryName, categoryValue]) => {
      const category: Category = {
        title: categoryName,
        items: [],
      };
      categorys.push(category);
      Object.entries(categoryValue).forEach(([, scriptItem]) => {
        category.items.push(scriptItem);
      });
    });
    setCategorys(categorys);
  }, []);

  return (
    <List isLoading={categorys === undefined}>
      {categorys?.map((category) => (
        <List.Section key={category.title} title={category.title}>
          {category.items.map((item) => {
            return <ListItem item={item} key={item.info.title} />;
          })}
        </List.Section>
      ))}
    </List>
  );
}

const ListItem = React.memo(function ListItem(props: { item: Script }) {
  const { pop, push } = useNavigation();

  const item = props.item;
  const info = item.info;

  const keyword = useMemo(
    () =>
      info.keywords?.reduce((keywordArray, currentKeyword) => {
        currentKeyword.split("")?.reduce((preString, currentString) => {
          keywordArray.push(preString + currentString);
          return preString + currentString;
        }, "");
        return keywordArray;
      }, [] as string[]),
    [info.keywords],
  );

  function moveWindow(runType: RunType) {
    if (runType === "clipboard") {
      if (item.info.type.includes("list")) {
        push(<InputListView info={info} />);
      } else {
        push(<InputFormView info={info} />);
      }
    } else if (runType === "list") {
      push(<InputListView info={info} />);
    } else if (runType === "form") {
      push(<InputFormView info={info} />);
    }
  }

  async function action(runType: RunType) {
    if (isClipboardScriptRunning) return;
    selectScript = item.run;

    if (runType === "clipboard") {
      isClipboardScriptRunning = true;
      const query = await isClipboardContent();

      let scriptResult = { result: "", isSuccess: false };
      if (query) {
        scriptResult = await runScript(query);
        if (scriptResult.isSuccess) {
          await Clipboard.copy(scriptResult.result);
          await copyAction(pop);
        }
      }
      isClipboardScriptRunning = false;
      if (scriptResult.isSuccess) {
        await showHUD("✅ Result Copied to Clipboard");
      } else {
        if (scriptResult.result) {
          await showToast(Toast.Style.Failure, scriptResult.result);
        }
        moveWindow(runType);
      }
    } else {
      moveWindow(runType);
    }
  }

  return (
    <List.Item
      title={info.title}
      accessoryTitle={info.desc}
      keywords={keyword}
      icon={info.icon}
      actions={
        <ActionPanel>
          {info.type.map((type) => {
            return type === "list" ? (
              <Action
                key={type}
                title={"Run Script"}
                icon={Icon.Pencil}
                onAction={async () => {
                  action("list");
                }}
              />
            ) : type === "form" ? (
              <Action
                key={type}
                title={"Run Script to Form"}
                icon={Icon.Document}
                onAction={async () => {
                  action("form");
                }}
              />
            ) : (
              <Action
                key={type}
                title={"Run Script to Clipboard"}
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
                onAction={async () => {
                  action("clipboard");
                }}
              />
            );
          })}
        </ActionPanel>
      }
    />
  );
});

const useScriptHook = () => {
  const [content, setContent] = useState<Result>({
    query: "",
    result: "",
    isLoading: false,
    isWaiting: false,
    isError: false,
  });
  const [isLive, setIsLive] = useState(true);
  useEffect(() => {
    return () => {
      selectScript = null;
      setIsLive(false);
    };
  }, []);

  async function startScript() {
    if (content.query.length > 0) {
      isLive && setContent((prev) => ({ ...prev, isLoading: true }));

      const scriptResult = await runScript(content.query);
      isLive &&
        setContent((prev) => ({
          ...prev,
          result: scriptResult.result,
          isLoading: false,
          isError: !scriptResult.isSuccess,
        }));
    } else {
      isLive && setContent((prev) => ({ ...prev, result: "", isError: false }));
    }
  }

  useEffect(() => {
    if (content.isLoading) {
      setContent((prev) => ({ ...prev, isWaiting: true }));
      return;
    }
    startScript();
  }, [content.query]);

  useEffect(() => {
    if (!content.isLoading && content.isWaiting) {
      setContent((prev) => ({ ...prev, isWaiting: false }));
      startScript();
    }
  }, [content.isLoading, content.isWaiting]);

  return { content, setContent };
};

function ResultActionView(props: { content: Result; info: Info }) {
  const { pop } = useNavigation();
  const content = props.content;
  const info = props.info;
  return (
    !content.isError &&
    content.result.length > 0 && (
      <ActionPanel title={info.title}>
        <ActionPanel.Section>
          <Action
            title="Copy Result to Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(content.result);
              await showHUD("✅ Result Copied to Clipboard");
              await copyAction(pop);
            }}
          />

          <Action
            title="Copy Query to Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(content.query);
              await showHUD("✅ Query Copied to Clipboard");
              await copyAction(pop);
            }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    )
  );
}

function InputListView(props: { info: Info }) {
  const info = props.info;
  const { content, setContent } = useScriptHook();

  return (
    <List
      navigationTitle={"ToolBox - " + info.title}
      isLoading={content.isLoading}
      searchBarPlaceholder={"Enter your query here"}
      onSearchTextChange={(query: string) => {
        setContent({ ...content, query: query });
      }}
    >
      <List.Item
        title={content.result}
        actions={ResultActionView({ content, info })}
        subtitle={content.query.length <= 0 ? "Result" : ""}
        accessoryTitle={content.query.length <= 0 ? "Waiting for query" : content.isError ? "Error" : "Success"}
      />
      <List.Item title="" subtitle={"Example"} accessoryTitle={info.example} />
    </List>
  );
}

function InputFormView(props: { info: Info }) {
  const info = props.info;
  const { content, setContent } = useScriptHook();

  return (
    <Form
      navigationTitle={"ToolBox - " + info.title}
      actions={ResultActionView({ content, info })}
      isLoading={content.isLoading}
    >
      <Form.TextArea
        id="query"
        title="Query"
        placeholder={info.example}
        value={content.query}
        onChange={(query: string) =>
          setContent({
            ...content,
            query: query,
          })
        }
      />
      <Form.TextArea id="result" title="Result" value={content.result} />
    </Form>
  );
}

async function isClipboardContent() {
  const { stdout } = await execa("pbpaste");
  if (stdout.length === 0) {
    return false;
  }
  return stdout;
}

async function runScript(query: string): Promise<{ result: string; isSuccess: boolean }> {
  const state = {
    result: "",
    isSuccess: false,
  };
  try {
    const result = selectScript?.(query);
    if (typeof result !== "string") {
      throw result;
    }
    state.result = result;
    state.isSuccess = true;
    return state;
  } catch (error) {
    if (error instanceof Error) {
      state.result = error.message;
    } else {
      state.result = "Failure";
    }
    return state;
  }
}

const copyAction = async (pop: () => void) => {
  switch (preferences.copy) {
    case "back":
      pop();
      break;
    case "exit":
      await popToRoot({ clearSearchBar: true });
      break;
    default:
      break;
  }
};
