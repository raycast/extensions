import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTimeValues, parseTime, TimestampUnit } from "./time";

function TimeRows({ date, prefix }: { date: Date; prefix: string }) {
  return getTimeValues(date).map(({ id, title, value }) => (
    <List.Item
      key={`${prefix}-${id}`}
      id={`${prefix}-${id}`}
      icon={id === "local" || id === "utc" ? Icon.Calendar : Icon.Clock}
      title={value}
      accessories={[{ text: title }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`复制${title}`} content={value} />
        </ActionPanel>
      }
    />
  ));
}

export default function Command() {
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<TimestampUnit>("auto");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const result = input.trim() ? parseTime(input, unit) : undefined;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <List
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder="输入时间戳或日期，如 2026-11-06 14:30:00"
      searchBarAccessory={
        <List.Dropdown tooltip="输入时间戳的单位" value={unit} onChange={(value) => setUnit(value as TimestampUnit)}>
          <List.Dropdown.Item title="自动识别秒 / 毫秒" value="auto" />
          <List.Dropdown.Item title="时间戳按秒解析" value="seconds" />
          <List.Dropdown.Item title="时间戳按毫秒解析" value="milliseconds" />
        </List.Dropdown>
      }
    >
      {result && (
        <List.Section title="转换结果" subtitle={"date" in result ? `按${result.source}解析` : "请检查输入"}>
          {"date" in result ? (
            <TimeRows date={result.date} prefix="result" />
          ) : (
            <List.Item id="error" icon={Icon.Warning} title="无法转换" subtitle={result.error} />
          )}
        </List.Section>
      )}
      <List.Section title="当前时间 · 每秒更新" subtitle={`本地时区：${timeZone}`}>
        <TimeRows date={now} prefix="now" />
      </List.Section>
      {!result && (
        <List.Section title="输入说明">
          <List.Item
            title="输入时间戳或日期字符串，即时显示转换结果"
            subtitle="选中结果后按 Enter 复制"
            icon={Icon.Info}
          />
          <List.Item
            title="自动模式：绝对值最多 10 位按秒，更多位按毫秒"
            subtitle="有歧义时可手动选择单位"
            icon={Icon.Info}
          />
          <List.Item
            title="日期默认使用本地时区"
            subtitle="支持 YYYY-MM-DD、日期时间及带 Z / +08:00 的 ISO 日期"
            icon={Icon.Info}
          />
        </List.Section>
      )}
    </List>
  );
}
