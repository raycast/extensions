import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "Work started at": "Work started at {{workStartedAt}}",
      WorkingTime: "You have worked for {{durationInMinutes}} minutes",
    },
  },
  ja: {
    translation: {
      "Empty epic name": "エピック名が空です",
      "Setting up...": "準備中...",
      "Discard ongoing work?": "未登録の作業があります",
      "Log time": "時間を記録する",
      "Epic name / description (optional)": "エピック名 / デスクリプション（任意）",
      "Work started at": "{{workStartedAt}}から作業中です",
      Epic: "エピック",
      "Start Working": "作業を開始",
      "Delete This Epic": "エピックを一覧から削除する",
      "Finish Work (Discard Work)": "作業を終了(記録しない)",
      "Create Epic From Search Query": "エピックを追加 (名前は検索クエリーになります)",
      "Create New Epic From Action Menu": "Actionsからエピックを登録しましょう！",
      Discard: "破棄して開始",
      Cancel: "キャンセル",
      "Epic with this name already exists": "エピック名が重複しています",
      "Failed to record time": "開始時間がないため登録は失敗しました",
      WorkingTime: "作業時間は{{durationInMinutes}}分でした",
      "Finish working (record time)": "作業を終了(記録する)",
      "Edit Description": "デスクリプションを更新する",
      "Show Working Time": "作業時間を表示する",
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
