import React from "react";
import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface AnalysisRecord {
  date: string;
  filename: string;
  summary?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistoryRecords() {
      try {
        setIsLoading(true);

        // 历史记录目录
        const historyDir = path.join(
          os.homedir(),
          "PycharmProjects/chrome_history/history_records",
        );

        if (!fs.existsSync(historyDir)) {
          setRecords([]);
          return;
        }

        // 读取所有CSV文件
        const files = fs
          .readdirSync(historyDir)
          .filter(
            (file) =>
              file.startsWith("browser_history_") && file.endsWith(".csv"),
          )
          .sort()
          .reverse();

        const analysisRecords: AnalysisRecord[] = [];

        for (const file of files) {
          const date = file.replace("browser_history_", "").replace(".csv", "");

          // 检查是否有对应的摘要文件
          const summaryFile = path.join(historyDir, `summary_${date}.txt`);
          let summary: string | undefined;

          if (fs.existsSync(summaryFile)) {
            summary = fs.readFileSync(summaryFile, "utf8");
          }

          analysisRecords.push({
            date,
            filename: path.join(historyDir, file),
            summary,
          });
        }

        setRecords(analysisRecords);
      } catch (e) {
        console.error(e);
        setError(
          `加载历史记录失败: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHistoryRecords();
  }, []);

  if (error) {
    return <Detail markdown={`# 错误\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="搜索历史分析记录...">
      {records.length === 0 && !isLoading ? (
        <List.EmptyView
          title="没有找到历史分析记录"
          description="请先运行浏览历史分析功能生成记录"
        />
      ) : (
        records.map((record, index) => (
          <List.Item
            key={index}
            title={`${record.date} 的浏览历史分析`}
            actions={
              <ActionPanel>
                {record.summary ? (
                  <Action.Push
                    title="查看分析结果"
                    target={
                      <Detail
                        markdown={`# ${record.date} 浏览历史分析\n\n${record.summary}`}
                      />
                    }
                  />
                ) : null}
                <Action.OpenInBrowser
                  title="打开CSV文件"
                  url={`file://${record.filename}`}
                />
                <Action.CopyToClipboard
                  title="复制文件路径"
                  content={record.filename}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
