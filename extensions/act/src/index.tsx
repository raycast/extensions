import { useState, useEffect } from "react";
import { getSelectedText, ActionPanel, Action, closeMainWindow, Detail, Color, Clipboard } from "@raycast/api";
import { youdaoTrans } from "./utils";
interface transObject {
  srcText?: string;
  tarText?: string;
  phonetic?: string;
}
interface responseObject {
  data?: transObject;
  error?: Error; //?表示该属性可选
}

export default function Command() {
  // const time;
  const [res, setData] = useState<responseObject>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setStartTime(Date.now());
      try {
        const selectedText = await getSelectedText();
        // const encoder = new TextEncoder();
        // const decoder = new TextDecoder();
        // 分别去除了pdf单词连字符、pdf换行符 同时补充了单词间空格
        // 感谢 https://www.utf8-chartable.de/unicode-utf8-table.pl?utf8=dec
        // eslint-disable-next-line no-control-regex
        const format = selectedText
          .replace(/\u0002/g, "")
          .replace(/\u000A/g, "")
          .replace(/\u000D/g, " ");
        //粗粒度控制 不够精细
        // const format = selectedText.replace(/[\u0001-\u001F]/g, "");
        console.log(format);
        // console.log(decoder.decode(format))
        const result = await youdaoTrans(format);
        const [srcText, tarText, phonetic] = result;
        setData({ data: { srcText: srcText, tarText: tarText, phonetic: phonetic } });
        await Clipboard.copy(tarText);
      } catch (error) {
        setData({ error: error instanceof Error ? error : new Error("Unknown error") });
      }
      setEndTime(Date.now());
    };
    fetchData();
  }, [getSelectedText, youdaoTrans, Clipboard]);
  if (res.error)
    return (
      <Detail
        markdown={"# Error \n " + res.error?.message}
        actions={
          <ActionPanel>
            <Action
              title="Close Windows"
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              onAction={() => {
                closeMainWindow();
              }}
            />
          </ActionPanel>
        }
      />
    );
  else {
    const loading = !res.data?.srcText && !res.data?.tarText;
    if (loading) {
      return (
        <Detail
          markdown={"# Requesting... \n " + "Please waiting for a moment."}
          isLoading={true}
          actions={
            <ActionPanel>
              <Action
                title="Close Windows"
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                onAction={() => {
                  closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      );
    } else {
      const executionTime = endTime && startTime ? (endTime - startTime) / 1000 : null;
      const markdown = "## 原文:\n" + res.data?.srcText + "\n## 译文:\n" + res.data?.tarText;
      const firstItem = { title: "", text: "" };
      if (!res.data?.phonetic) {
        firstItem.title = "原文长度";
        firstItem.text = res.data?.srcText?.length.toString() + " 字符";
      } else {
        firstItem.title = "词汇注音";
        firstItem.text = res.data?.phonetic;
      }
      return (
        <Detail
          actions={
            <ActionPanel>
              <Action
                title="Close Windows"
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                onAction={() => {
                  closeMainWindow();
                }}
              />
            </ActionPanel>
          }
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="翻译来源" text={`有道`} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title={firstItem.title} text={{ color: Color.Blue, value: firstItem.text }} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="所耗时间"
                text={{ color: Color.Green, value: executionTime?.toString() + " s" }}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link
                title="接口文档"
                target="https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html"
                text="Youdao"
              />
              <Detail.Metadata.Link
                title=""
                target="https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html"
                text="Raycast"
              />
            </Detail.Metadata>
          }
        />
      );
    }
  }
}
