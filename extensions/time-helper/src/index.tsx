import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, closeMainWindow, Form, PopToRootType, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import { setTimeout } from "timers/promises";
import Style = Toast.Style;

export default function Command() {

  const [input, setInput] = useState("now");
  const [convert, setConvert] = useState<string | boolean>("");
  useEffect(() => {

    if (!input) {
      setConvert(false);
      return;
    }

    if (!Number.isNaN(Number(input))) {
      // 时间戳
      const d = dayjs.unix(Number(input));
      if (d.isValid()) {
        setConvert(d.format("YYYY-MM-DD HH:mm:ss"));
      } else {
        setConvert(false);
      }
    } else {
      // 日期
      const d = input === "now" ? dayjs() : dayjs(input);
      if (d.isValid()) {
        setConvert(d.unix().toString());
      } else {
        setConvert(false);
      }
    }
  }, [input]);

  async function handleSubmit() {

    if (convert) {
      await Clipboard.copy(convert as string);
      await showToast({ title: convert as string, message: "已复制到剪切板", style: Style.Success });
      await setTimeout(500);
      await closeMainWindow({ clearRootSearch: true,popToRootType:PopToRootType.Immediate });
    } else {
      await showToast({ title: "非法的", message: "", style: Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={"Copy"} />
        </ActionPanel>
      }
    >
      <Form.TextField id="date" title="输入日期/时间戳" value={input} onChange={setInput}
                      error={convert === false ? "非法数据" : ""} />
      <Form.TextField id="convert" title="转换后时间戳/日期" value={convert === false ? "" : convert as string} />
    </Form>
  );
}
