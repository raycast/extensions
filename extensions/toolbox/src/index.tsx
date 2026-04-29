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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelectionOrClipboard } from "./hooks/useClipboard";
import * as scripts from "./script";
import { Category, Info, Result, Run, RunType, Script } from "./script/type";

const preferences = getPreferenceValues();

export default function ToolboxList() {
  const [categorys, setCategorys] = useState<Category[]>();
  const { text: inputText, isLoading: isInputLoading } = useSelectionOrClipboard();

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
            return <ListItem item={item} inputText={inputText} isInputLoading={isInputLoading} key={item.info.title} />;
          })}
        </List.Section>
      ))}
    </List>
  );
}

const ListItem = React.memo(function ListItem(props: { item: Script; inputText: string; isInputLoading: boolean }) {
  const { pop, push } = useNavigation();
  const isClipboardScriptRunning = useRef(false);

  const item = props.item;
  const info = item.info;
  const inputText = props.inputText;
  const isInputLoading = props.isInputLoading;

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

  function openInputView(runType: RunType, initialQuery?: string) {
    if (runType === "list") {
      push(<InputListView info={info} run={item.run} initialQuery={initialQuery} />);
      return;
    }

    if (runType === "form") {
      push(<InputFormView info={info} run={item.run} initialQuery={initialQuery} />);
      return;
    }

    if (runType === "clipboard") {
      if (item.info.type.includes("list")) {
        push(<InputListView info={info} run={item.run} initialQuery={initialQuery} />);
      } else {
        push(<InputFormView info={info} run={item.run} initialQuery={initialQuery} />);
      }
    }
  }

  async function action(runType: RunType) {
    if (isClipboardScriptRunning.current) return;

    if (runType === "clipboard") {
      if (!inputText) {
        openInputView(runType);
        return;
      }

      isClipboardScriptRunning.current = true;
      const scriptResult = runScript(item.run, inputText);

      if (scriptResult.isSuccess) {
        await Clipboard.copy(scriptResult.result);
        await showHUD("✅ Result Copied to Clipboard");
        await copyAction(pop);
      } else {
        if (scriptResult.result) {
          await showToast(Toast.Style.Failure, scriptResult.result);
        }
        openInputView(runType);
      }

      isClipboardScriptRunning.current = false;
    } else {
      openInputView(runType);
    }
  }

  const preview = useMemo(() => {
    if (isInputLoading || inputText.length === 0) {
      return { hasInput: false, isSuccess: false, result: "" };
    }

    const result = runScript(item.run, inputText);
    return { hasInput: true, ...result };
  }, [inputText, isInputLoading, item.run]);

  const previewText =
    preview.hasInput && preview.isSuccess && preview.result.length > 0 ? truncatePreview(preview.result) : undefined;

  const hasIncompatibleInput = preview.hasInput && !preview.isSuccess;
  const canApply = preview.hasInput && preview.isSuccess;

  const accessories: List.Item.Accessory[] = [
    ...(hasIncompatibleInput ? [{ icon: Icon.Warning }] : []),
    { text: info.desc },
  ];

  return (
    <List.Item
      title={info.title}
      keywords={keyword}
      icon={info.icon}
      subtitle={previewText}
      actions={
        <ActionPanel>
          {canApply && (
            <Action
              title="Apply Result"
              icon={Icon.Checkmark}
              onAction={async () => {
                await Clipboard.paste(preview.result);
              }}
            />
          )}
          {canApply && (
            <Action.Push
              title="Edit Before Applying"
              icon={Icon.Pencil}
              target={
                item.info.type.includes("list") ? (
                  <InputListView info={info} run={item.run} initialQuery={inputText} />
                ) : (
                  <InputFormView info={info} run={item.run} initialQuery={inputText} />
                )
              }
            />
          )}
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
      accessories={accessories}
    />
  );
});

const useScriptHook = (run: Run, initialQuery = "") => {
  const [content, setContent] = useState<Result>({
    query: initialQuery,
    result: "",
    isLoading: false,
    isWaiting: false,
    isError: false,
  });
  useEffect(() => {
    let isActive = true;

    if (content.query.length === 0) {
      setContent((prev) => ({
        ...prev,
        result: "",
        isLoading: false,
        isWaiting: false,
        isError: false,
      }));
      return () => {
        isActive = false;
      };
    }

    setContent((prev) => ({ ...prev, isLoading: true, isWaiting: false }));
    const scriptResult = runScript(run, content.query);
    if (isActive) {
      setContent((prev) => ({
        ...prev,
        result: scriptResult.result,
        isLoading: false,
        isError: !scriptResult.isSuccess,
      }));
    }

    return () => {
      isActive = false;
    };
  }, [content.query, run]);

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

function InputListView(props: { info: Info; run: Run; initialQuery?: string }) {
  const info = props.info;
  const { content, setContent } = useScriptHook(props.run, props.initialQuery ?? "");

  return (
    <List
      navigationTitle={"ToolBox - " + info.title}
      isLoading={content.isLoading}
      searchBarPlaceholder={"Enter your query here"}
      searchText={content.query}
      onSearchTextChange={(query: string) => {
        setContent((prev) => ({ ...prev, query }));
      }}
    >
      <List.Item
        title={content.result}
        actions={ResultActionView({ content, info })}
        subtitle={content.query.length <= 0 ? "Result" : ""}
        accessories={[
          {
            text: content.query.length <= 0 ? "Waiting for query" : content.isError ? "Error" : "Success",
          },
        ]}
      />
      <List.Item
        title=""
        subtitle={"Example"}
        accessories={[
          {
            text: info.example,
          },
        ]}
      />
    </List>
  );
}

function InputFormView(props: { info: Info; run: Run; initialQuery?: string }) {
  const info = props.info;
  const { content, setContent } = useScriptHook(props.run, props.initialQuery ?? "");

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
          setContent((prev) => ({
            ...prev,
            query,
          }))
        }
      />
      <Form.TextArea id="result" title="Result" value={content.result} />
    </Form>
  );
}

const PREVIEW_MAX_LENGTH = 80;

function truncatePreview(value: string, maxLength = PREVIEW_MAX_LENGTH) {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 3)) + "...";
}

function runScript(run: Run, query: string): { result: string; isSuccess: boolean } {
  const state = {
    result: "",
    isSuccess: false,
  };
  try {
    const result = run(query);
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
