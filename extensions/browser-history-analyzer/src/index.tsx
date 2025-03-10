import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import OpenAI from "openai"; // 使用OpenAI库
import { stringify } from "csv-stringify/sync";
import fetch from "node-fetch";
import React from "react";

// 设置全局 fetch
// @ts-expect-error global fetch is required for OpenAI client
global.fetch = fetch;

interface Preferences {
  apiKey: string;
  systemPrompt: string;
  model: string;
}

interface HistoryItem {
  url: string;
  title: string;
  visitTime: string;
  browser: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 移除这行，因为它在 summarizeWithGemini 函数中已经定义
  // const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoading(true);

        console.log("开始获取浏览器历史记录...");
        const allHistoryData = await getAllBrowserHistory();
        console.log(`获取到 ${allHistoryData.length} 条历史记录`);
        setHistoryItems(allHistoryData);

        if (allHistoryData.length > 0) {
          console.log("开始导出到CSV...");
          const csvPath = await exportToCsv(allHistoryData);
          console.log(`CSV导出完成: ${csvPath}`);

          console.log("开始使用Gemini分析...");
          // 添加超时处理
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(
              () => reject(new Error("请求超时，Gemini API 响应时间过长")),
              60000,
            ); // 60秒超时
          });
          const summaryText = await Promise.race([
            summarizeWithGemini(allHistoryData),
            timeoutPromise,
          ]);
          console.log("Gemini分析完成");
          setSummary(summaryText);
        } else {
          setSummary("未找到任何历史记录");
        }
      } catch (e) {
        console.error("错误详情:", e);
        setError(
          `获取历史记录失败: ${e instanceof Error ? e.message : String(e)}`,
        );
        await showToast({
          style: Toast.Style.Failure,
          title: "错误",
          message: `获取历史记录失败: ${e instanceof Error ? e.message : String(e)}`,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (error) {
    return <Detail markdown={`# 错误\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="搜索浏览历史...">
      <List.Section title="浏览历史分析">
        <List.Item
          title="查看今日浏览历史总结"
          subtitle={
            isLoading ? "正在分析..." : `共 ${historyItems.length} 条记录`
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="查看详细分析"
                target={
                  <Detail
                    markdown={`# 今日浏览历史分析\n\n${summary || "正在生成分析..."}`}
                  />
                }
              />
              <Action.CopyToClipboard title="复制分析结果" content={summary} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="浏览记录">
        {historyItems.map((item, index) => (
          <List.Item
            key={index}
            title={item.title || "无标题"}
            subtitle={item.visitTime}
            accessories={[{ text: item.browser }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="复制URL" content={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function getAllBrowserHistory(): Promise<HistoryItem[]> {
  const allHistoryData: HistoryItem[] = [];

  try {
    // 获取Chrome历史记录
    const chromeData = await getChromeHistory();
    allHistoryData.push(...chromeData);

    // 获取Arc历史记录
    const arcData = await getArcHistory();
    allHistoryData.push(...arcData);

    // 按访问时间排序
    return allHistoryData.sort(
      (a, b) =>
        new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime(),
    );
  } catch (error) {
    console.error("获取浏览器历史记录失败:", error);
    throw error;
  }
}

async function getChromeHistory(): Promise<HistoryItem[]> {
  try {
    const basePath = path.join(
      os.homedir(),
      "Library/Application Support/Google/Chrome",
    );

    // 获取所有配置文件路径
    const defaultProfilePath = path.join(basePath, "Default/History");
    const profilePaths = [defaultProfilePath];

    // 查找其他配置文件
    const profileDirs = fs
      .readdirSync(basePath)
      .filter((dir) => dir.startsWith("Profile "));
    profilePaths.push(
      ...profileDirs.map((dir) => path.join(basePath, dir, "History")),
    );

    // 从每个配置文件获取历史记录
    const allChromeData: HistoryItem[] = [];

    for (const profilePath of profilePaths) {
      if (fs.existsSync(profilePath)) {
        try {
          const historyData = await getHistoryFromDb(profilePath, "Chrome");
          allChromeData.push(...historyData);
        } catch (e) {
          console.error(`处理Chrome配置文件 ${profilePath} 时出错:`, e);
        }
      }
    }

    return allChromeData;
  } catch (error) {
    console.error("获取Chrome历史记录失败:", error);
    return [];
  }
}

async function getArcHistory(): Promise<HistoryItem[]> {
  try {
    const arcHistoryPath = path.join(
      os.homedir(),
      "Library/Application Support/Arc/User Data/Default/History",
    );

    if (fs.existsSync(arcHistoryPath)) {
      return await getHistoryFromDb(arcHistoryPath, "Arc");
    }
    return [];
  } catch (error) {
    console.error("获取Arc历史记录失败:", error);
    return [];
  }
}

async function getHistoryFromDb(
  historyPath: string,
  browserName: string,
): Promise<HistoryItem[]> {
  const tempPath = `/tmp/${browserName}_history_${Date.now()}`;

  try {
    // 复制历史记录文件到临时位置
    execSync(`cp -c "${historyPath}" "${tempPath}" 2>/dev/null`);

    // 使用SQLite查询历史记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp =
      Math.floor((today.getTime() - new Date("1601-01-01").getTime()) / 1000) *
      1000000;

    const query = `
      SELECT url, title, last_visit_time 
      FROM urls 
      WHERE last_visit_time > ${todayTimestamp} 
      ORDER BY last_visit_time DESC
    `;

    const result = execSync(`sqlite3 -csv "${tempPath}" "${query}"`).toString();

    // 解析结果
    const rows = result.trim().split("\n");
    const historyData: HistoryItem[] = [];

    for (const row of rows) {
      if (!row) continue;

      const [url, title, timestamp] = row
        .split(",")
        .map((item) => item.replace(/^"|"$/g, ""));

      if (url && timestamp) {
        // 将Chrome时间戳转换为JavaScript日期
        // Chrome时间戳是从1601年1月1日开始的微秒数
        const microseconds = parseInt(timestamp, 10);
        const epochTime =
          new Date("1601-01-01").getTime() + microseconds / 1000;
        const visitDate = new Date(epochTime);

        // 调整为东八区时间 (UTC+8)
        visitDate.setHours(visitDate.getHours() + 8);

        historyData.push({
          url,
          title: title || url,
          visitTime: visitDate.toISOString().replace("T", " ").substring(0, 19),
          browser: browserName,
        });
      }
    }

    return historyData;
  } catch (error) {
    console.error(`获取${browserName}历史记录失败:`, error);
    throw error;
  } finally {
    // 清理临时文件
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

async function exportToCsv(data: HistoryItem[]): Promise<string> {
  // 创建历史记录存储目录
  const historyDir = path.join(__dirname, "history_records"); // 使用当前文件夹路径
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  // 获取当前日期作为文件名
  const todayDate = new Date().toISOString().split("T")[0];
  const filename = path.join(historyDir, `browser_history_${todayDate}.csv`);

  // 转换为CSV格式
  const csvData = stringify(
    data.map((item) => [item.url, item.title, item.visitTime, item.browser]),
    { header: true, columns: ["URL", "Title", "Visit Time", "Browser"] },
  );

  // 写入文件
  fs.writeFileSync(filename, csvData, "utf8");

  return filename;
}

async function saveSummary(summary: string): Promise<string> {
  // 创建历史记录存储目录
  const historyDir = path.join(__dirname, "history_records"); // 使用当前文件夹路径
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  // 获取当前日期作为文件名
  const todayDate = new Date().toISOString().split("T")[0];
  const filename = path.join(historyDir, `summary_${todayDate}.txt`);

  // 写入文件
  fs.writeFileSync(filename, summary, "utf8");

  return filename;
}

async function summarizeWithGemini(
  historyData: HistoryItem[],
): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    return "警告：未设置 Gemini API Key，请在插件首选项中设置";
  }

  try {
    console.log("正在初始化 OpenAI 客户端...");
    const client = new OpenAI({
      apiKey: preferences.apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    console.log("OpenAI 客户端初始化完成");

    const systemPrompt =
      preferences.systemPrompt ||
      "请分析以下浏览历史，总结用户今天的浏览活动和兴趣点。";
    const historyText =
      "今天的浏览记录：\n" +
      historyData
        .map((item) => `- ${item.visitTime}: ${item.title} (${item.url})`)
        .join("\n");

    console.log("正在发送请求到 API...");
    const response = await client.chat.completions.create({
      model: preferences.model || "gemini-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: historyText },
      ],
    });

    if (!response || !response.choices || response.choices.length === 0) {
      console.error("API 返回了空响应或无效响应");
      console.error("请求详细信息:", {
        model: preferences.model || "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: historyText },
        ],
      });
      return "API 返回了空响应，请检查日志以获取更多信息";
    }

    const summaryText = response.choices[0].message.content || "无法生成摘要";
    console.log("生成的摘要:", summaryText.substring(0, 100) + "...");

    await saveSummary(summaryText);
    return summaryText;
  } catch (error) {
    console.error("生成总结时发生错误:", error);
    const errorDetails =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack}`
        : String(error);
    console.error("详细错误信息:", errorDetails);

    return `生成总结时发生错误: ${error instanceof Error ? error.message : String(error)}`;
  }
}
