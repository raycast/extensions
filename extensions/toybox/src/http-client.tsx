import { useCallback, useEffect, useState } from "react";
import { Clipboard, Detail } from "@raycast/api";

import { createDefaultRequest, type RequestModel } from "./models/request";
import { looksLikeCurl, parseCurl } from "./services/curlParser";
import { RequestForm } from "./components/RequestForm";

/**
 * HTTP Client 主命令。
 *
 * 打开时自动读取剪贴板：若内容以 `curl` 开头且能被 `curlconverter` 解析，
 * 则自动填充请求表单并提示「已从剪贴板导入 curl」；否则进入空白表单。
 * 「重新解析」会再次读取剪贴板并以新 key 重新挂载 `RequestForm`。
 */
type LoadState = { request: RequestModel; imported: boolean; ready: boolean; reparseKey: number };

export default function Command() {
  const [state, setState] = useState<LoadState>({
    request: createDefaultRequest(),
    imported: false,
    ready: false,
    reparseKey: 0,
  });

  const readAndParse = useCallback(async (): Promise<void> => {
    const text = await Clipboard.readText();
    const trimmed = (text ?? "").trim();
    if (trimmed && looksLikeCurl(trimmed)) {
      const result = parseCurl(trimmed);
      if (result.ok) {
        setState((s) => ({ request: result.request, imported: true, ready: true, reparseKey: s.reparseKey + 1 }));
        return;
      }
    }
    setState((s) => ({ request: createDefaultRequest(), imported: false, ready: true, reparseKey: s.reparseKey + 1 }));
  }, []);

  useEffect(() => {
    readAndParse();
  }, [readAndParse]);

  if (!state.ready) {
    return <Detail isLoading markdown="正在读取剪贴板…" />;
  }

  return (
    <RequestForm
      key={state.reparseKey}
      initialRequest={state.request}
      importedFromClipboard={state.imported}
      onReparse={readAndParse}
    />
  );
}
