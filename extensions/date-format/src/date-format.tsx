import { ActionPanel, Action, List, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";
dayjs.extend(relativeTime);
dayjs.locale("ko");

interface DateFormat {
  title: string;
  value: string;
  description?: string;
  icon: Icon;
}

export default function Command(props: { arguments: Arguments.DateFormat }) {
  const { dateInput } = props.arguments;
  const [formats, setFormats] = useState<DateFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processDate() {
      try {
        let date: Date;
        let dateSource = "";

        if (dateInput && dateInput.trim() !== "") {
          // 입력된 날짜 파싱
          const parsedDate = parseDate(dateInput);
          if (!parsedDate) {
            throw new Error("유효하지 않은 날짜 형식입니다");
          }
          date = parsedDate;
          dateSource = "입력값";
        } else {
          // 입력이 없으면 클립보드 확인
          const clipboardText = await Clipboard.readText();

          if (clipboardText && clipboardText.trim() !== "") {
            const clipboardDate = parseDate(clipboardText.trim());

            if (clipboardDate && !isNaN(clipboardDate.getTime())) {
              date = clipboardDate;
              dateSource = "클립보드";
              await showToast({
                style: Toast.Style.Success,
                title: "클립보드에서 날짜 감지",
                message: clipboardText.trim(),
              });
            } else {
              // 클립보드에 유효한 날짜가 없으면 현재 시간 사용
              date = new Date();
              dateSource = "현재 시간";
            }
          } else {
            // 클립보드가 비어있으면 현재 시간 사용
            date = new Date();
            dateSource = "현재 시간";
          }
        }

        const formattedDates = generateFormats(date, dateSource);
        setFormats(formattedDates);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
        setFormats([]);
      } finally {
        setIsLoading(false);
      }
    }

    processDate();
  }, [dateInput]);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "오류",
      message: error,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="날짜 포맷 검색...">
      {formats.map((format, index) => (
        <List.Item
          key={index}
          title={format.title}
          subtitle={format.value}
          accessories={format.description ? [{ text: format.description }] : undefined}
          icon={format.icon}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="클립보드에 복사"
                content={format.value}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.Paste title="붙여넣기" content={format.value} shortcut={{ modifiers: ["cmd"], key: "v" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function parseDate(input: string): Date | null {
  // 1. 먼저 기본 Date 파싱 시도
  let date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // 2. dayjs 파싱 시도
  const dayjsDate = dayjs(input);
  if (dayjsDate.isValid()) {
    return dayjsDate.toDate();
  }

  // 2. Unix timestamp (초) 시도 - 10자리 숫자
  if (/^\d{10}$/.test(input)) {
    date = new Date(parseInt(input) * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 3. Unix timestamp (밀리초) 시도 - 13자리 숫자
  if (/^\d{13}$/.test(input)) {
    date = new Date(parseInt(input));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 4. YYYY-MM-DD 형식
  const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 5. DD/MM/YYYY 또는 MM/DD/YYYY 형식
  const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    // 미국식(MM/DD/YYYY)으로 먼저 시도
    date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function generateFormats(date: Date, dateSource?: string): DateFormat[] {
  const formats: DateFormat[] = [];

  if (dateSource) {
    formats.push({
      title: "Source",
      value: dateSource,
      description: date.toLocaleString("ko-KR"),
      icon: Icon.Info,
    });
  }

  formats.push({
    title: "Locale DateTime",
    value: new Intl.DateTimeFormat("ko", {
      dateStyle: "long",
      timeStyle: "long",
    })
      .format(date)
      .replace(/GMT[+-]\d{1,2}/, ""),
    description: "",
    icon: Icon.Text,
  });

  formats.push({
    title: "Locale Date",
    value: new Intl.DateTimeFormat("ko", {
      dateStyle: "long",
    }).format(date),
    description: "",
    icon: Icon.Calendar,
  });

  formats.push({
    title: "Locale Time",
    value: new Intl.DateTimeFormat("ko", {
      timeStyle: "long",
      hour12: true,
    })
      .format(date)
      .replace(/GMT[+-]\d{1,2}/, ""),
    description: "12-hour format",
    icon: Icon.Clock,
  });

  formats.push({
    title: "Locale Time",
    value: new Intl.DateTimeFormat("ko", {
      timeStyle: "long",
      hour12: false,
    })
      .format(date)
      .replace(/GMT[+-]\d{1,2}/, ""),
    description: "24-hour format",
    icon: Icon.Clock,
  });

  formats.push({
    title: "Relative Time",
    value: dayjs(date).fromNow(),
    description: "",
    icon: Icon.ArrowClockwise,
  });

  formats.push({
    title: "ISO 8601",
    value: date.toISOString(),
    description: "",
    icon: Icon.Calendar,
  });

  formats.push({
    title: "Unix Timestamp (Seconds)",
    value: Math.floor(date.getTime() / 1000).toString(),
    description: "Seconds since epoch",
    icon: Icon.Clock,
  });

  formats.push({
    title: "Unix Timestamp (Milliseconds)",
    value: date.getTime().toString(),
    description: "Milliseconds since epoch",
    icon: Icon.Clock,
  });

  return formats;
}
