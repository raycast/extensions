import { Clipboard, showToast, Toast } from "@raycast/api";
import { typst2tex } from "tex2typst";

export default async function Command() {
  const { text } = await Clipboard.read();
  if (!text || text.trim().length === 0) {
    await showToast({
      title: "変換できません",
      message: "クリップボードに Typst テキストが見つかりませんでした。",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    const tex = typst2tex(text);
    await Clipboard.copy(tex);
    await showToast({
      title: "変換が完了しました。",
      message: "クリップボードに TeX テキストがコピーされました。",
      style: Toast.Style.Success,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await showToast({
      title: "変換に失敗しました。",
      message,
      style: Toast.Style.Failure,
    });
  }
}
