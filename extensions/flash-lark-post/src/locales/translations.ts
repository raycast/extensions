export type Language = "ja" | "en";

export const translations = {
  ja: {
    // Common
    cancel: "キャンセル",
    next: "次へ",
    back: "戻る",
    complete: "完了",
    save: "保存",
    test: "テスト",
    settings: "設定",

    // Setup Status
    setupRequired: "初期設定が必要です",
    missingFields: "未設定項目",
    setupMethods: "設定方法",
    guidedSetup: "ガイド付きセットアップを開始",
    guidedSetupDesc: "詳細な手順で安全にセットアップ",
    guidedSetupTime: "所要時間: 約10分",
    manualSetup: "手動設定（Extension Preferences）",
    manualSetupDesc: "上級者向け",
    manualSetupTime: "所要時間: 約3分",
    recommendation:
      "初回利用の場合は「ガイド付きセットアップ」を選択してください。詳細な手順でスムーズに設定できます。",
    setupLater: "後で設定する",

    // Onboarding - Welcome
    welcomeTitle: "FlashLarkPost へようこそ！",
    welcomeDesc: "RaycastからLark/Feishuへワンアクションでメモを送信できる拡張機能です。",
    features: "主な機能",
    featureAttachment: "添付ファイル送付",
    featureAttachmentDesc: "画像・PDF・動画ファイルを簡単にアップロード",
    featureTimestamp: "タイムスタンプ付与",
    featureTimestampDesc: "メッセージに日時を自動追加（ON/OFF可能）",
    featureGlobal: "Global/China対応",
    featureGlobalDesc: "どちらの環境でも利用可能",
    featureSecure: "セキュア",
    featureSecureDesc: "認証情報は安全に保管",
    setupFlow: "セットアップの流れ",
    setupStep1: "Larkアプリ作成",
    setupStep1Desc: "開発者コンソールでBot作成",
    setupStep2: "基本設定",
    setupStep2Desc: "App ID・Secretの設定",
    setupStep3: "受信者設定",
    setupStep3Desc: "メール送信先の設定",
    setupStep4: "動作テスト",
    setupStep4Desc: "実際にテスト送信",
    estimatedTime: "所要時間: 約10分",
    readyQuestion: "準備はできましたか？",
    startSetup: "セットアップ開始",

    // Language Selection
    selectLanguage: "言語を選択 / Select Language",
    languagePrompt: "セットアップで使用する言語を選択してください。",
    japanese: "日本語",
    english: "English",

    // Lark Setup
    larkSetupTitle: "Larkアプリの作成",
    larkSetupIntro:
      "まず、Lark/Feishuでカスタムアプリを作成する必要があります。この手順は初回のみ必要で、一度作成すれば継続して利用できます。",
    devConsole: "開発者コンソールへアクセス",
    globalVersion: "Global版（推奨）",
    chinaVersion: "China版",
    createAppSteps: "詳細な作成手順",
    step1CreateApp: "📱 ステップ1: アプリ作成",
    step1Details: [
      "1. 開発者コンソールにアクセス",
      "2. 「Create App」ボタンをクリック",
      "3. 「Custom App」を選択",
      "4. App Name: 「Quick Memo」（任意の名前でOK）",
      "5. Description: 「Raycast extension for quick memos」",
      "6. 「Create」をクリックして作成完了",
    ],
    step2EnableBot: "🤖 ステップ2: Bot機能を有効化",
    step2Details: [
      "1. 作成したアプリの管理画面を開く",
      "2. 左メニューから「Add features and capabilities」タブをクリック",
      "3. 「Bot」セクションを見つけて「Enable」をクリック",
      "4. Bot機能が有効化されたことを確認",
    ],
    step3Permissions: "🔐 ステップ3: 権限設定（重要）",
    step3Details: [
      "1. 左メニューから「Permissions & Scopes」タブをクリック",
      "2. 「Bot Token Scopes」セクションを見つける",
      "3. 以下の権限を必ず追加してください:",
      "   ✅ im:message - Send messages as the app",
      "   ✅ im:message:send_as_bot - Send messages as bot",
      "4. 「Save」をクリックして権限を保存",
    ],
    step4Release: "🚀 ステップ4: アプリをリリース",
    step4Details: [
      "1. 左メニューから「Version Management & Release」タブをクリック",
      "2. 「Create Version」ボタンをクリック",
      "3. バージョン情報を入力（例: v1.0.0）",
      "4. 「Submit for Release」をクリック",
      "5. 社内リリースの承認を待つ（通常数分〜数時間）",
      "6. ステータスが「Released」になるまで待機",
    ],
    step5GetCredentials: "🔑 ステップ5: 認証情報を取得",
    step5Details: [
      "1. 左メニューから「Credentials」タブをクリック",
      "2. 以下の情報をコピーして保存:",
      "   📋 App ID (例: cli_a1b2c3d4e5f6g7h8)",
      "   📋 App Secret (例: abcdef123456789...)",
      "3. これらの情報は次のステップで使用します",
      "4. セキュリティのため、他人と共有しないでください",
    ],
    allDoneQuestion:
      "すべての手順が完了しましたか？アプリがリリース済みで、認証情報も取得できていることを確認してください。",
    completed: "完了しました",

    // Basic Config
    basicConfigTitle: "基本設定",
    basicConfigDesc:
      "前のステップで取得したLarkアプリの認証情報を入力してください。これらの情報は安全に保存され、メッセージ送信時の認証に使用されます。",
    larkDomain: "Lark Domain",
    selectEnv: "あなたのLark/Feishu環境を選択してください",
    appId: "App ID",
    appIdPlaceholder: "cli_xxxxxxxxxxxxxxxx",
    appIdInfo:
      "Lark開発者コンソールの「Credentials」タブからコピーしてください。「cli_」で始まる文字列です。",
    appSecret: "App Secret",
    appSecretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxx",
    appSecretInfo:
      "Lark開発者コンソールの「Credentials」タブからコピーしてください。長い英数字の文字列です。",

    // Receiver Config
    receiverConfigTitle: "受信者設定",
    receiverConfigDesc:
      "メッセージの送信先を設定してください。メールアドレス形式が最も確実で推奨されます。",
    receiveIdType: "Receive ID Type",
    receiveIdTypeInfo: "メールアドレス形式を強く推奨します（最も確実）",
    emailRecommended: "Email（推奨・最も確実）",
    openIdAdvanced: "Open ID（上級者向け）",
    receiveId: "Receive ID",
    receiveIdPlaceholder: "your.email@company.com",
    receiveIdEmailInfo:
      "あなたのLarkログインメールアドレスを正確に入力してください。大文字小文字も含めて完全一致が必要です。",
    receiveIdOpenInfo:
      "LarkプロフィールからOpen IDをコピーして入力してください。「ou_」で始まる文字列です。",
    receiverHint:
      "💡 ヒント: Larkアプリでプロフィール → アカウント設定から正確なメールアドレスを確認できます。スペルミスがあると送信に失敗します。",

    // Test Connection
    testConnectionTitle: "接続テスト",
    testConnectionIntro:
      "設定した内容でLarkへの接続をテストします。このテストが成功すれば、すべての設定が正しく完了しています。",
    configReview: "設定内容確認",
    domain: "Domain",
    testSteps: "テスト手順",
    testStep1: "「接続テスト」ボタンをクリック",
    testStep2: "Larkにテストメッセージ「🧪 FlashLarkPost接続テスト成功！」が送信されます",
    testStep3: "Larkアプリでメッセージを受信確認後、セットアップ完了",
    readyToTest:
      "準備ができたらテストを開始してください。失敗した場合は設定を見直すことができます。",
    startTest: "接続テスト開始",
    fixSettings: "設定を修正",
    testing: "接続テスト中...",
    testSuccess: "接続成功！",
    testSuccessMsg: "Larkにテストメッセージを送信しました。Larkアプリで受信を確認してください。",
    testFailed: "接続失敗",
    checkSettings:
      "設定を確認してください。App ID、App Secret、受信者IDのいずれかに問題がある可能性があります。",

    // Complete
    completeTitle: "セットアップ完了！",
    completeDesc: "FlashLarkPostの設定が正常に完了しました。",
    completedItems: "設定済み内容",
    larkConnected: "Larkアプリ接続確認済み",
    messageTestSuccess: "メッセージ送信テスト成功",
    allSettingsOk: "全ての設定が正常動作",
    usage: "使用方法",
    usageStep1: "Cmd + Shift + M で拡張を起動",
    usageStep2: "メモを入力",
    usageStep3: "Cmd + Shift + Enter で送信",
    usageStep4: "Larkで受信確認",
    saveSettings: "設定の保存",
    saveSettingsDesc: "設定が自動的に保存されました。",
    saveSettingsBtn: "完了",

    // Memo Form
    sendMemo: "送信",
    changeSettings: "設定を変更",
    linkSettings: "連携設定",
    memoPlaceholder: "送る内容…",
    memoTitle: "メモ",
    sent: "送信しました ✅",
    sendFailed: "送信失敗",
    checkingSettings: "設定を確認中...",

    // Error
    unknownError: "unknown error",
  },

  en: {
    // Common
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    complete: "Complete",
    save: "Save",
    test: "Test",
    settings: "Settings",

    // Setup Status
    setupRequired: "Initial Setup Required",
    missingFields: "Missing Fields",
    setupMethods: "Setup Methods",
    guidedSetup: "Start Guided Setup",
    guidedSetupDesc: "Safe setup with detailed instructions",
    guidedSetupTime: "Time required: ~10 minutes",
    manualSetup: "Manual Setup (Extension Preferences)",
    manualSetupDesc: "For advanced users",
    manualSetupTime: "Time required: ~3 minutes",
    recommendation:
      'For first-time users, we recommend selecting "Guided Setup" for smooth configuration with detailed instructions.',
    setupLater: "Setup Later",

    // Onboarding - Welcome
    welcomeTitle: "Welcome to FlashLarkPost!",
    welcomeDesc: "A Raycast extension that lets you send memos to Lark/Feishu with one action.",
    features: "Key Features",
    featureAttachment: "File Attachments",
    featureAttachmentDesc: "Easily upload images, PDFs, and video files",
    featureTimestamp: "Timestamp Addition",
    featureTimestampDesc: "Automatically add date/time to messages (ON/OFF available)",
    featureGlobal: "Global/China Support",
    featureGlobalDesc: "Works in both environments",
    featureSecure: "Secure",
    featureSecureDesc: "Credentials stored safely",
    setupFlow: "Setup Flow",
    setupStep1: "Create Lark App",
    setupStep1Desc: "Create Bot in developer console",
    setupStep2: "Basic Config",
    setupStep2Desc: "Configure App ID & Secret",
    setupStep3: "Receiver Setup",
    setupStep3Desc: "Set email recipient",
    setupStep4: "Test",
    setupStep4Desc: "Send test message",
    estimatedTime: "Estimated time: ~10 minutes",
    readyQuestion: "Ready to start?",
    startSetup: "Start Setup",

    // Language Selection
    selectLanguage: "Select Language / 言語を選択",
    languagePrompt: "Please select the language for setup.",
    japanese: "日本語",
    english: "English",

    // Lark Setup
    larkSetupTitle: "Create Lark App",
    larkSetupIntro:
      "First, you need to create a custom app in Lark/Feishu. This is a one-time setup that will enable continuous use once completed.",
    devConsole: "Access Developer Console",
    globalVersion: "Global Version (Recommended)",
    chinaVersion: "China Version",
    createAppSteps: "Detailed Creation Steps",
    step1CreateApp: "📱 Step 1: Create App",
    step1Details: [
      "1. Access the developer console",
      '2. Click the "Create App" button',
      '3. Select "Custom App"',
      '4. App Name: "Quick Memo" (any name is fine)',
      '5. Description: "Raycast extension for quick memos"',
      '6. Click "Create" to complete creation',
    ],
    step2EnableBot: "🤖 Step 2: Enable Bot Features",
    step2Details: [
      "1. Open the management screen for your created app",
      '2. Click "Add features and capabilities" tab from the left menu',
      '3. Find the "Bot" section and click "Enable"',
      "4. Confirm that Bot features are enabled",
    ],
    step3Permissions: "🔐 Step 3: Set Permissions (Important)",
    step3Details: [
      '1. Click "Permissions & Scopes" tab from the left menu',
      '2. Find the "Bot Token Scopes" section',
      "3. Make sure to add the following permissions:",
      "   ✅ im:message - Send messages as the app",
      "   ✅ im:message:send_as_bot - Send messages as bot",
      '4. Click "Save" to save permissions',
    ],
    step4Release: "🚀 Step 4: Release App",
    step4Details: [
      '1. Click "Version Management & Release" tab from the left menu',
      '2. Click "Create Version" button',
      "3. Enter version information (e.g., v1.0.0)",
      '4. Click "Submit for Release"',
      "5. Wait for internal release approval (usually minutes to hours)",
      '6. Wait until status becomes "Released"',
    ],
    step5GetCredentials: "🔑 Step 5: Get Credentials",
    step5Details: [
      '1. Click "Credentials" tab from the left menu',
      "2. Copy and save the following information:",
      "   📋 App ID (e.g., cli_a1b2c3d4e5f6g7h8)",
      "   📋 App Secret (e.g., abcdef123456789...)",
      "3. You will use this information in the next step",
      "4. For security, do not share with others",
    ],
    allDoneQuestion:
      "Have you completed all steps? Please confirm that your app is released and you have obtained the credentials.",
    completed: "Completed",

    // Basic Config
    basicConfigTitle: "Basic Configuration",
    basicConfigDesc:
      "Enter the Lark app credentials you obtained in the previous step. This information will be securely stored and used for authentication when sending messages.",
    larkDomain: "Lark Domain",
    selectEnv: "Select your Lark/Feishu environment",
    appId: "App ID",
    appIdPlaceholder: "cli_xxxxxxxxxxxxxxxx",
    appIdInfo: 'Copy from "Credentials" tab in Lark developer console. It starts with "cli_".',
    appSecret: "App Secret",
    appSecretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxx",
    appSecretInfo:
      'Copy from "Credentials" tab in Lark developer console. It\'s a long alphanumeric string.',

    // Receiver Config
    receiverConfigTitle: "Receiver Configuration",
    receiverConfigDesc:
      "Configure the message recipient. Email format is most reliable and recommended.",
    receiveIdType: "Receive ID Type",
    receiveIdTypeInfo: "Email format is strongly recommended (most reliable)",
    emailRecommended: "Email (Recommended & Most Reliable)",
    openIdAdvanced: "Open ID (Advanced)",
    receiveId: "Receive ID",
    receiveIdPlaceholder: "your.email@company.com",
    receiveIdEmailInfo:
      "Enter your exact Lark login email address. Case-sensitive exact match required.",
    receiveIdOpenInfo: 'Copy Open ID from your Lark profile. It starts with "ou_".',
    receiverHint:
      "💡 Tip: Check your exact email address in Lark app: Profile → Account Settings. Typos will cause sending failures.",

    // Test Connection
    testConnectionTitle: "Test Connection",
    testConnectionIntro:
      "Test the connection to Lark with your configuration. If this test succeeds, all settings are correctly completed.",
    configReview: "Configuration Review",
    domain: "Domain",
    testSteps: "Test Steps",
    testStep1: 'Click "Test Connection" button',
    testStep2: 'A test message "🧪 FlashLarkPost connection test successful!" will be sent to Lark',
    testStep3: "After confirming receipt in Lark app, setup is complete",
    readyToTest: "Start the test when ready. If it fails, you can review and fix the settings.",
    startTest: "Start Connection Test",
    fixSettings: "Fix Settings",
    testing: "Testing connection...",
    testSuccess: "Connection successful!",
    testSuccessMsg: "Test message sent to Lark. Please check receipt in your Lark app.",
    testFailed: "Connection failed",
    checkSettings:
      "Please check your settings. There may be an issue with App ID, App Secret, or Receiver ID.",

    // Complete
    completeTitle: "Setup Complete!",
    completeDesc: "FlashLarkPost has been configured successfully.",
    completedItems: "Completed Items",
    larkConnected: "Lark app connection verified",
    messageTestSuccess: "Message test successful",
    allSettingsOk: "All settings working correctly",
    usage: "How to Use",
    usageStep1: "Press Cmd + Shift + M to launch extension",
    usageStep2: "Type your memo",
    usageStep3: "Press Cmd + Shift + Enter to send",
    usageStep4: "Check receipt in Lark",
    saveSettings: "Settings Saved",
    saveSettingsDesc: "Settings have been saved automatically.",
    saveSettingsBtn: "Complete",

    // Memo Form
    sendMemo: "Send",
    changeSettings: "Change Settings",
    linkSettings: "Link Settings",
    memoPlaceholder: "Type your memo...",
    memoTitle: "Memo",
    sent: "Sent successfully ✅",
    sendFailed: "Send failed",
    checkingSettings: "Checking settings...",

    // Error
    unknownError: "unknown error",
  },
};

export function getTranslation(language: Language): typeof translations.ja {
  return translations[language];
}
