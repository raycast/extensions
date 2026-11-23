import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { formatTime, parseInput } from "./lib/time";
import { FORMAT_HELP } from "./lib/format-help";

const SOURCE_LABELS = {
  current: "当前时间 · 每秒刷新",
  seconds: "已识别为秒级时间戳",
  milliseconds: "已识别为毫秒级时间戳",
  date: "日期 → 时间戳",
};

function InputActions({
  onInput,
  input,
}: {
  onInput: (text: string) => void;
  input: string;
}) {
  async function readClipboard() {
    try {
      const text = await Clipboard.readText();
      if (text?.trim()) {
        onInput(text.trim());
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "剪贴板中没有文本",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "无法读取剪贴板，请直接粘贴到搜索框",
      });
    }
  }

  return (
    <>
      <ActionPanel.Section title="输入">
        <Action
          title="读取剪贴板"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={readClipboard}
        />
        <Action
          title="显示当前时间"
          icon={Icon.Clock}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => onInput("")}
        />
        <Action
          title="试试 10 位时间戳"
          icon={Icon.Number00}
          onAction={() => onInput("1700000000")}
        />
        <Action
          title="试试 13 位时间戳"
          icon={Icon.Number00}
          onAction={() => onInput("1700000000123")}
        />
        <Action
          title="试试日期转时间戳"
          icon={Icon.Calendar}
          onAction={() => onInput("2026-10-15 12:00:00")}
        />
        <Action
          title="试试中文日期"
          icon={Icon.Calendar}
          onAction={() => onInput("2026年10月15日 下午3点04分05秒")}
        />
        <Action
          title="试试 RFC 邮件日期"
          icon={Icon.Envelope}
          onAction={() => onInput("Thu, 15 Oct 2026 12:00:00 +0800")}
        />
        {/^(?:(?:us|eu):\s*)?\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/i.test(input) && (
          <>
            <Action
              title="按美式月/日/年解析"
              icon={Icon.Calendar}
              onAction={() =>
                onInput(`us:${input.replace(/^(us|eu):\s*/i, "")}`)
              }
            />
            <Action
              title="按欧式日/月/年解析"
              icon={Icon.Calendar}
              onAction={() =>
                onInput(`eu:${input.replace(/^(us|eu):\s*/i, "")}`)
              }
            />
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="设置时区与日期顺序"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
        <Action.Push
          title="查看支持的时间格式"
          icon={Icon.QuestionMarkCircle}
          target={
            <Detail markdown={FORMAT_HELP} navigationTitle="时间格式参考" />
          }
        />
      </ActionPanel.Section>
    </>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.ConvertTime }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState(props.arguments.input ?? "");
  const [timezone, setTimezone] = useState<string>(
    preferences.timezone ?? "Asia/Shanghai",
  );
  const [now, setNow] = useState(Date.now);
  const result = parseInput(
    input,
    timezone,
    now,
    preferences.dateOrder ?? "auto",
  );
  const isCurrent = result.ok && result.source === "current";

  useEffect(() => {
    if (!isCurrent) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isCurrent]);

  const formatted = result.ok
    ? formatTime(result.milliseconds, timezone)
    : undefined;
  const rows = formatted
    ? [
        {
          id: "date",
          label:
            timezone === "Asia/Shanghai"
              ? "北京时间"
              : timezone === "UTC"
                ? "UTC 时间"
                : "本地时间",
          value: formatted.dateTime,
          hint: `${formatted.timezone} · ${formatted.offset}`,
          icon: Icon.Calendar,
          color: Color.Blue,
        },
        {
          id: "seconds",
          label: "秒级时间戳",
          value: formatted.seconds,
          hint: formatted.hasMilliseconds
            ? "Unix 秒 · 向下取整"
            : "Unix 秒 · 通常 10 位",
          icon: Icon.Number00,
          color: Color.Green,
        },
        {
          id: "milliseconds",
          label: "毫秒级时间戳",
          value: formatted.milliseconds,
          hint: "Unix 毫秒 · 通常 13 位",
          icon: Icon.Number00,
          color: Color.Orange,
        },
        {
          id: "iso",
          label: "ISO 8601",
          value: formatted.iso,
          hint: "Z 表示 UTC",
          icon: Icon.Code,
          color: Color.Purple,
        },
        {
          id: "local-iso",
          label: "ISO · 所选时区",
          value: formatted.localIso,
          hint: "包含明确时区偏移",
          icon: Icon.Code,
          color: Color.Purple,
        },
        {
          id: "rfc",
          label: "RFC 2822",
          value: formatted.rfc2822,
          hint: "邮件日期 · 精度到秒",
          icon: Icon.Envelope,
          color: Color.SecondaryText,
        },
        {
          id: "http",
          label: "HTTP 日期",
          value: formatted.http,
          hint: "GMT · 精度到秒",
          icon: Icon.Globe,
          color: Color.SecondaryText,
        },
        {
          id: "compact",
          label: "紧凑日期",
          value: formatted.compact,
          hint: "YYYYMMDDHHmmss · 精度到秒",
          icon: Icon.Calendar,
          color: Color.Blue,
        },
        ...(timezone === "UTC"
          ? []
          : [
              {
                id: "utc",
                label: "UTC 时间",
                value: formatted.utc,
                hint: "UTC+00:00",
                icon: Icon.Globe,
                color: Color.SecondaryText,
              },
            ]),
      ]
    : [];

  return (
    <List
      navigationTitle="时间戳转换"
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder="时间戳、ISO、中文/英文日期；⌘K 查看支持格式"
      searchBarAccessory={
        <List.Dropdown
          tooltip="显示时区；不带时区的日期也按此时区解析"
          value={timezone}
          onChange={setTimezone}
        >
          <List.Dropdown.Item
            title="北京时间"
            value="Asia/Shanghai"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="本地时区"
            value="local"
            icon={Icon.Desktop}
          />
          <List.Dropdown.Item title="UTC" value="UTC" icon={Icon.Globe} />
        </List.Dropdown>
      }
    >
      {result.ok && formatted ? (
        <List.Section
          title={
            result.inputFormat
              ? `已识别：${result.inputFormat}`
              : SOURCE_LABELS[result.source]
          }
          subtitle="选中后按 ↵ 复制 · ⌘K 更多操作"
        >
          {rows.map((row) => (
            <List.Item
              key={row.id}
              id={row.id}
              title={row.value}
              subtitle={row.label}
              icon={{ source: row.icon, tintColor: row.color }}
              accessories={[{ text: row.hint }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="复制结果">
                    <Action.CopyToClipboard
                      title={`复制${row.label}`}
                      content={row.value}
                    />
                    <Action.CopyToClipboard
                      title="复制秒级时间戳"
                      content={formatted.seconds}
                      shortcut={Keyboard.Shortcut.Common.Duplicate}
                    />
                    <Action.CopyToClipboard
                      title="复制毫秒级时间戳"
                      content={formatted.milliseconds}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    />
                    <Action.CopyToClipboard
                      title="复制日期时间"
                      content={formatted.dateTime}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <InputActions onInput={setInput} input={input} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="还不能转换这个输入"
          description={result.ok ? "请输入时间戳或日期" : result.error}
          actions={
            <ActionPanel>
              <InputActions onInput={setInput} input={input} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
