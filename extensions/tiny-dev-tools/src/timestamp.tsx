import { useEffect, useState } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Clipboard,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { parseTimestamp, parseDateInput, fmtLocal, fmtUTC, fmtISO, fmtRelative, detectTimestampLike } from "./lib/pure";
import { usePrefill } from "./lib/prefill";

const SEC = 1000;

export default function Command() {
  const prefill = usePrefill(detectTimestampLike);
  const [now, setNow] = useState<Date>(() => new Date());
  const [query, setQuery] = useState<string>("");

  // 实时时钟 + 选中文本注入式预填（与迁移前行为一致：一次性 setQuery）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    if (prefill) setQuery(prefill);
    return () => clearInterval(timer);
  }, [prefill]);

  const q = query.trim();

  // 模式一：展示当前时间
  const showNow = !q;
  const parsedTs = q ? parseTimestamp(q) : null;
  const parsedDate = q ? parseDateInput(q) : null;

  const items: Array<{
    key: string;
    title: string;
    subtitle?: string;
    copyValue: string;
    accessories?: string[];
  }> = [];

  if (showNow) {
    const s = Math.floor(now.getTime() / SEC);
    const ms = now.getTime();
    const us = now.getTime() * 1000;
    items.push(
      { key: "s", title: String(s), subtitle: "Unix seconds (click to copy)", copyValue: String(s), accessories: ["sec (s)"] },
      { key: "ms", title: String(ms), subtitle: "Milliseconds (click to copy)", copyValue: String(ms), accessories: ["ms"] },
      { key: "us", title: String(us), subtitle: "Microseconds (click to copy)", copyValue: String(us), accessories: ["µs"] },
      { key: "local", title: fmtLocal(now), subtitle: "Local time", copyValue: fmtLocal(now) },
      { key: "utc", title: fmtUTC(now), subtitle: "UTC", copyValue: fmtUTC(now) },
      { key: "iso", title: fmtISO(now), subtitle: "ISO 8601", copyValue: fmtISO(now) },
    );
  } else if (parsedTs) {
    // 模式二：输入timestamp → 多格式date
    const d = parsedTs.date;
    items.push(
      { key: "local", title: fmtLocal(d), subtitle: "Local time", copyValue: fmtLocal(d) },
      { key: "utc", title: fmtUTC(d), subtitle: "UTC", copyValue: fmtUTC(d) },
      { key: "iso", title: fmtISO(d), subtitle: "ISO 8601", copyValue: fmtISO(d) },
      {
        key: "s",
        title: String(Math.floor(d.getTime() / SEC)),
        subtitle: "Unix seconds",
        copyValue: String(Math.floor(d.getTime() / SEC)),
      },
      {
        key: "ms",
        title: String(d.getTime()),
        subtitle: "Milliseconds",
        copyValue: String(d.getTime()),
      },
      { key: "rel", title: fmtRelative(d, now), subtitle: "Relative", copyValue: fmtRelative(d, now) },
    );
  } else if (parsedDate) {
    // 模式三：输入date/相对表达式 → timestamp
    items.push(
      {
        key: "s",
        title: String(Math.floor(parsedDate.getTime() / SEC)),
        subtitle: "Unix seconds",
        copyValue: String(Math.floor(parsedDate.getTime() / SEC)),
      },
      { key: "ms", title: String(parsedDate.getTime()), subtitle: "Milliseconds", copyValue: String(parsedDate.getTime()) },
      { key: "local", title: fmtLocal(parsedDate), subtitle: "Local time", copyValue: fmtLocal(parsedDate) },
      { key: "utc", title: fmtUTC(parsedDate), subtitle: "UTC", copyValue: fmtUTC(parsedDate) },
      { key: "iso", title: fmtISO(parsedDate), subtitle: "ISO 8601", copyValue: fmtISO(parsedDate) },
    );
  } else {
    items.push({
      key: "err",
      title: "Unrecognized input",
      subtitle: "Accepts: numeric timestamp | date string | relative (-1d / +2h30m)",
      copyValue: "",
    });
  }

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="timestamp / date / relative (-1d, +2h30m) | empty shows current time"
      isShowingDetail={false}
    >
      {showNow && <List.Section title={`Current time · ${fmtLocal(now)}`}>{items.map(renderItem)}</List.Section>}
      {!showNow && parsedTs && <List.Section title={`Timestamp ${parsedTs.value} (${unitName(parsedTs.unit)})`}>{items.map(renderItem)}</List.Section>}
      {!showNow && !parsedTs && parsedDate && <List.Section title="Date → Timestamp">{items.map(renderItem)}</List.Section>}
      {!showNow && !parsedTs && !parsedDate && <List.Section title="Parse failed">{items.map(renderItem)}</List.Section>}
      <List.EmptyView
        title="Unrecognized input"
        description="Accepts: numeric timestamp (s/ms/µs), date string (2026-11-03 12:30:30), relative (-1d, +2h30m)"
        icon={Icon.ExclamationMark}
      />
    </List>
  );
}

function unitName(u: "s" | "ms" | "us"): string {
  return u === "s" ? "s" : u === "ms" ? "ms" : "µs";
}

function renderItem(it: { key: string; title: string; subtitle?: string; copyValue: string; accessories?: string[] }) {
  return (
    <List.Item
      key={it.key}
      icon={Icon.Clock}
      title={it.title}
      subtitle={it.subtitle}
      accessories={it.accessories?.map((t) => ({ text: t }))}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy"
            content={it.copyValue}
            onCopy={async () => {
              await showToast(Toast.Style.Success, "Copied", it.title);
            }}
          />
          <Action.Paste title="Paste to Frontmost App" content={it.copyValue} shortcut={Keyboard.Shortcut.Common.Edit} />
        </ActionPanel>
      }
    />
  );
}
