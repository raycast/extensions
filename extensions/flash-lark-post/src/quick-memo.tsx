import { useState } from "react";
import { Language } from "./locales/translations";
import MemoForm from "./components/memo-form";

export default function Command() {
  const [language] = useState<Language>("ja");

  // セットアップが完了していない場合は、MemoFormに処理を委譲
  // MemoFormが適切にセットアップ状態を処理します
  return <MemoForm language={language} />;
}
