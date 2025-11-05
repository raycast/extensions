import { Clipboard, showToast, Toast } from "@raycast/api";
import { tex2typst } from "tex2typst";

export default async function Command() {
  const { text } = await Clipboard.read();
  if (!text || text.trim().length === 0) {
    await showToast({
      title: "変換できません",
      message: "クリップボードに TeX テキストが見つかりませんでした。",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    const typst = tex2typst(text);
    await Clipboard.copy(typst);
    await showToast({
      title: "変換が完了しました。",
      message: "クリップボードに Typst テキストがコピーされました。",
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
