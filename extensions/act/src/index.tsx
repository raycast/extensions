import { useState, useEffect } from "react";
import { getSelectedText, closeMainWindow, Color, List, Icon, Detail, Action, ActionPanel } from "@raycast/api";
import { youdaoTranslate } from "./Youdao";
import { youdaoTranslateResult, youdaoWebExplains } from "./type";

function TranslateCopyActionPanel(props: { copy_content: string; url: string | undefined }) {
  const { copy_content, url } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        content={copy_content}
        title="CopyToClipboard"
        shortcut={{ modifiers: [], key: "enter" }}
      />
      {url ? (
        <Action.OpenInBrowser title="OpenInBrowser" url={url} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
      ) : null}
    </ActionPanel>
  );
}

function ExitActionPanel() {
  return (
    <ActionPanel>
      <Action
        title="Close Windows"
        shortcut={{ modifiers: [], key: "enter" }}
        onAction={() => {
          closeMainWindow();
        }}
      />
    </ActionPanel>
  );
}

function ErrorMessage(props: { message: string }) {
  const { message } = props;
  return <Detail markdown={"# Error \n " + message} actions={<ExitActionPanel />} />;
}

function LoadingMessage(props: { message: string }) {
  const { message } = props;
  return <Detail markdown={"# Loading... \n " + message} isLoading={true} actions={<ExitActionPanel />} />;
}

function YoudaoSentencesList(props: { result: youdaoTranslateResult }) {
  const { result } = props;
  return (
    <List isLoading={result.errorCode === "" || result.isWord}>
      {result.query ? (
        <List.Section title="查询内容">
          <List.Item
            title={result.query}
            icon={{ source: Icon.Dot, tintColor: Color.Red }}
            actions={
              <TranslateCopyActionPanel
                copy_content={result.query}
                url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
              />
            }
          />
        </List.Section>
      ) : null}
      {result.translation && result.translation.length > 0 ? (
        <List.Section title="翻译结果">
          {result.translation.map((item: string, index: number) => (
            <List.Item
              key={index}
              title={item}
              icon={{ source: Icon.Dot, tintColor: Color.Green }}
              actions={
                <TranslateCopyActionPanel
                  copy_content={item}
                  url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function YoudaoSentencesDetail(props: { result: youdaoTranslateResult; metadata: { executionTime: number } }) {
  const { result, metadata } = props;
  const src_text = result.query ? result.query : "未能获取";
  const tar_text = result.translation && result.translation.length > 0 ? result.translation[0] : "未能获取";
  const markdown = "# 查询内容 \n " + src_text + "\n------ \n # 翻译结果 \n " + tar_text;
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="翻译来源" text={`有道`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="原文长度"
            text={{ color: Color.Blue, value: src_text.length.toString() + " 字符" }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="所耗时间"
            text={{ color: Color.Green, value: metadata.executionTime?.toString() + " s" }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="接口文档"
            target="https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html"
            text="Youdao"
          />
          <Detail.Metadata.Link title="" target="https://developers.raycast.com" text="Raycast" />
        </Detail.Metadata>
      }
      actions={
        <TranslateCopyActionPanel
          copy_content={tar_text}
          url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
        />
      }
    />
  );
}

function YoudaoWordList(props: { result: youdaoTranslateResult }) {
  const { result } = props;
  return (
    <List isLoading={result.errorCode === "" || !result.isWord}>
      {result.basic && result.query && result.basic.phonetic ? (
        <List.Section title="查询词汇">
          <List.Item
            title={result.query}
            subtitle={"/" + result.basic.phonetic + "/"}
            icon={{ source: Icon.Dot, tintColor: Color.Green }}
            actions={
              <TranslateCopyActionPanel
                copy_content={result.query}
                url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
              />
            }
          />
        </List.Section>
      ) : null}

      {result.translation && result.translation.length > 0 ? (
        <List.Section title="翻译结果">
          {result.translation.map((item: string, index: number) => (
            <List.Item
              key={index}
              title={item}
              icon={{ source: Icon.Dot, tintColor: Color.Red }}
              actions={
                <TranslateCopyActionPanel
                  copy_content={item}
                  url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {result.basic && result.basic.explains && result.basic.explains.length > 0 ? (
        <List.Section title="详细结果">
          {result.basic.explains.map((item: string, index: number) => (
            <List.Item
              key={index}
              title={item}
              icon={{ source: Icon.Dot, tintColor: Color.Blue }}
              actions={
                <TranslateCopyActionPanel
                  copy_content={item}
                  url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {result.web && result.web.length > 0 ? (
        <List.Section title="网络释义">
          {result.web.map((item: youdaoWebExplains, index: number) => (
            <List.Item
              key={index}
              title={item.value.join(" ")}
              subtitle={item.key}
              icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
              actions={
                <TranslateCopyActionPanel
                  copy_content={item.value.join(" ")}
                  url={result.mTerminalDict && result.mTerminalDict.url ? result.mTerminalDict.url : undefined}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

// function sentenceList

export default function Command() {
  const [youdaoResult, setYoudaoResult] = useState<youdaoTranslateResult>({
    errorCode: "",
    l: "",
    isWord: false,
  });
  const [error, setError] = useState<Error | undefined>(undefined);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    const translate = async () => {
      try {
        setStartTime(Date.now());
        const selectedText = await getSelectedText();
        // const encoder = new TextEncoder();
        // const decoder = new TextDecoder();
        // 分别去除了pdf单词连字符、pdf换行符 同时补充了单词间空格
        // 感谢 https://www.utf8-chartable.de/unicode-utf8-table.pl?utf8=dec
        // eslint-disable-next-line no-control-regex
        const formatText = selectedText
          .replace(/\u0002/g, "")
          .replace(/\u000A/g, "")
          .replace(/\u000D/g, " ");
        console.log(formatText);
        // console.log(decoder.decode(formatText));
        setYoudaoResult((await youdaoTranslate(formatText)) as youdaoTranslateResult);
        setEndTime(Date.now());
      } catch (error) {
        const e = error instanceof Error ? error : new Error("Unknown error");
        console.error(e);
        setError(e);
      }
    };
    translate();
  }, [getSelectedText, youdaoTranslate]);

  if (error) {
    return <ErrorMessage message={error.message} />;
  } else {
    const executionTime = endTime && startTime ? (endTime - startTime) / 1000 : -1;
    console.log(executionTime);
    if (youdaoResult.errorCode === "") {
      return <LoadingMessage message="Please waiting for a moment." />;
    } else {
      if (youdaoResult.isWord) {
        return <YoudaoWordList result={youdaoResult} />;
      } else {
        return <YoudaoSentencesDetail result={youdaoResult} metadata={{ executionTime: executionTime }} />;
      }
    }
  }
}
