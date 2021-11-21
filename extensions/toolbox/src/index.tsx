import {
  ActionPanel,
  copyTextToClipboard,
  Form,
  Icon,
  List,
  showHUD,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import * as scripts from "./script";
import { Category, Info, Run, Script } from "./script/type";
import { readClipboard } from "./script/util";

let selectScript: Run | null = null;

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
  const { push } = useNavigation();

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
    [info.keywords]
  );

  async function action(config: { useClipboard: boolean; isWindowClose: boolean }) {
    selectScript = item.run;
    if (config.useClipboard) {
      const content = await isClipboardContent();
      if (content) {
        const result = await runScript({ content: content, isWindowClose: config.isWindowClose });
        if (!result) {
          push(<InputView info={info} />);
        } else {
          selectScript = null;
        }
      } else {
        push(<InputView info={info} />);
      }
    } else {
      push(<InputView info={info} />);
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
          {(info.type === "all" || info.type === "clipboard") && (
            <ActionPanel.Item
              title={"Run Script Clipboard"}
              icon={Icon.Clipboard}
              onAction={async () => {
                action({ useClipboard: true, isWindowClose: true });
              }}
            />
          )}
          {(info.type === "all" || info.type === "input") && (
            <ActionPanel.Item
              title={"Run Script Input"}
              icon={Icon.Text}
              onAction={async () => {
                action({ useClipboard: false, isWindowClose: false });
              }}
            />
          )}
          {(info.type === "all" || info.type === "clipboard") && (
            <ActionPanel.Item
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              title={"Run Script - Window Keep"}
              icon={Icon.Window}
              onAction={async () => {
                action({ useClipboard: true, isWindowClose: false });
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
});

function InputView(props: { info: Info }) {
  const info = props.info;
  const { pop } = useNavigation();
  const [content, setContent] = useState<string>("");
  useEffect(() => {
    return () => {
      selectScript = null;
    };
  }, []);

  return (
    <Form
      navigationTitle={"Toolbox - " + info.title}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title={"Run Script"}
            icon={Icon.Text}
            onAction={async () => {
              if (content.length > 0) {
                const result = await runScript({ content: content, isWindowClose: true });
                if (result) {
                  selectScript = null;
                  pop();
                }
              } else {
                showToast(ToastStyle.Failure, "Failure", "Please type it in.");
              }
            }}
          />
          <ActionPanel.Item
            title={"Run Script - Window Keep"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            icon={Icon.Window}
            onAction={async () => {
              if (content.length > 0) {
                await runScript({ content: content, isWindowClose: false });
              } else {
                showToast(ToastStyle.Failure, "Failure", "Please type it in.");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Data" placeholder={info.example} value={content} onChange={setContent} />
    </Form>
  );
}

async function isClipboardContent() {
  const content = await readClipboard();
  if (content.length === 0) {
    return false;
  }
  return content;
}

async function runScript(config: { content: string; isWindowClose: boolean }): Promise<boolean> {
  try {
    const result = selectScript?.(config.content);
    if (typeof result !== "string") {
      throw result;
    }
    copyTextToClipboard(result);
    if (config.isWindowClose) {
      await showHUD(result);
    } else {
      showToast(ToastStyle.Success, "Success", result);
    }
    showToast(ToastStyle.Success, "Success", result);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      showToast(ToastStyle.Failure, "Failure", error.message);
    } else {
      showToast(ToastStyle.Failure, "Failure");
    }
    return false;
  }
}
