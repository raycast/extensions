// アプリケーション内で使用される文言定数
export const TEXTS = {
  // フォーム関連
  title: "メモ",
  placeholder: "複数行のメモを入力してください...\n改行も自由に使えます",
  description: "⌘+Enter で Obsidian Daily Note に追加、⌘+W でキャンセル",

  // アクション関連
  actions: {
    submit: "Daily Noteに追加",
    cancel: "キャンセル",
  },

  // トースト通知関連
  toast: {
    error: {
      title: "エラー",
      emptyMemo: "メモが空です",
      submitFailed: (error: string) => `メモの追加に失敗しました: ${error}`,
    },
    success: {
      title: "成功",
      message: "Daily Note にメモを追加しました",
    },
  },

  // 設定画面関連
  settings: {
    title: "設定",
    description: "Obsidian Memo の設定を変更できます",

    // アクション
    actions: {
      save: "設定を保存",
      reset: "デフォルトに戻す",
      cancel: "キャンセル",
    },

    // フィールド
    fields: {
      obsidianVaultPath: {
        title: "Obsidian Vault Path",
        placeholder: "~/Documents/MyVault",
        info: "Obsidian ボルトのパス（必須）",
      },
      dailyNotesPath: {
        title: "Daily Notes Path",
        placeholder: "200_Daily/{{DATE:YYYY-MM-DD(ddd)}}.md",
        info: "Daily Note のパスパターン",
      },
      templatePath: {
        title: "Template Path",
        placeholder: "999_Templates/DailyNote.md",
        info: "テンプレートファイルのパス",
      },
      journalSection: {
        title: "Journal Section",
        placeholder: "## Journal",
        info: "メモを追加するセクション",
      },
      entryFormat: {
        title: "Entry Format",
        placeholder: "###### {{time}}&#10;{{content}}",
        info: "エントリーのフォーマット（{{time}} = 時刻、{{content}} = メモ内容）",
      },
      insertPosition: {
        title: "Insert Position",
        info: "新しいエントリーの挿入位置",
        options: {
          bottom: "セクションの末尾",
          top: "セクションの先頭",
        },
      },
      autoCreateTemplate: {
        title: "Auto Create from Template",
        label: "テンプレートから自動作成",
        info: "Daily Note が存在しない場合、テンプレートから作成する",
      },
      showSuccessNotification: {
        title: "Show Success Notification",
        label: "成功通知を表示",
        info: "メモ追加成功時に通知を表示する",
      },
    },
  },
} as const;
