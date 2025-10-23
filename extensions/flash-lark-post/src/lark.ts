import { getPreferenceValues, LocalStorage } from "@raycast/api";

// URL構築のヘルパー関数
function buildUrl(domain: string, path: string): string {
  if (domain.startsWith("https://") || domain.startsWith("http://")) {
    return `${domain}${path}`;
  }
  return `https://${domain}${path}`;
}

type Prefs = {
  larkDomain: string;
  appId: string;
  appSecret: string;
  receiveIdType: "email" | "open_id" | "chat_id";
  receiveId: string;
  prefixTimestamp?: boolean;
};

export type ChatInfo = {
  chat_id: string;
  name: string;
  description?: string;
  chat_type: "p2p" | "group" | "bot";
  avatar?: string;
  is_default?: boolean;
};

// Bot情報のキャッシュ用型
type CachedBotInfo = {
  botInfo: ChatInfo;
  appId: string;
  receiveId: string;
  timestamp: number;
};

// Bot情報をローカルストレージに保存
async function saveCachedBotInfo(
  botInfo: ChatInfo,
  appId: string,
  receiveId: string
): Promise<void> {
  const cacheKey = `cached-bot-info-${appId}-${receiveId}`;
  const cachedData: CachedBotInfo = {
    botInfo,
    appId,
    receiveId,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(cacheKey, JSON.stringify(cachedData));
  console.log(`💾 Bot情報をキャッシュに保存: ${botInfo.name} (${cacheKey})`);
}

// ローカルストレージからBot情報を取得
async function getCachedBotInfo(appId: string, receiveId: string): Promise<ChatInfo | null> {
  const cacheKey = `cached-bot-info-${appId}-${receiveId}`;
  try {
    const cachedDataStr = await LocalStorage.getItem<string>(cacheKey);
    if (!cachedDataStr) {
      return null;
    }

    const cachedData: CachedBotInfo = JSON.parse(cachedDataStr);

    // キャッシュの有効期限チェック（24時間）
    const cacheAge = Date.now() - cachedData.timestamp;
    const maxCacheAge = 24 * 60 * 60 * 1000; // 24時間

    if (cacheAge > maxCacheAge) {
      console.log(`⏰ Bot情報キャッシュが期限切れ: ${cacheKey}`);
      await LocalStorage.removeItem(cacheKey);
      return null;
    }

    // AppIDとreceiveIdが一致するかチェック
    if (cachedData.appId === appId && cachedData.receiveId === receiveId) {
      console.log(`📦 キャッシュからBot情報を取得: ${cachedData.botInfo.name} (${cacheKey})`);
      return cachedData.botInfo;
    }

    return null;
  } catch (error) {
    console.warn(`キャッシュ取得エラー: ${cacheKey}`, error);
    return null;
  }
}

export async function getTenantAccessToken(preferences?: Partial<Prefs>): Promise<string> {
  let larkDomain: string, appId: string, appSecret: string;

  if (preferences && preferences.larkDomain && preferences.appId && preferences.appSecret) {
    // 引数で渡された値を使用（テスト時など）
    ({ larkDomain, appId, appSecret } = preferences as Prefs);
  } else {
    // 通常のPreferencesから読み込み
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain, appId, appSecret } = prefs);
  }

  if (!larkDomain || !appId || !appSecret) {
    throw new Error("Preferences未設定（larkDomain/appId/appSecret）");
  }
  const url = buildUrl(larkDomain, "/open-apis/auth/v3/tenant_access_token/internal");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data: any = await res.json();
  if (!res.ok || (data && data.code)) {
    throw new Error(`tenant_access_token error: ${data?.code ?? res.status} ${data?.msg ?? ""}`);
  }
  return data.tenant_access_token as string;
}

export async function sendTextMessage(token: string, text: string, preferences?: Partial<Prefs>) {
  console.log("🔌 sendTextMessage called with:", { text, hasPreferences: !!preferences });

  let larkDomain: string, receiveIdType: string, receiveId: string;

  if (preferences && preferences.larkDomain && preferences.receiveIdType && preferences.receiveId) {
    // 引数で渡された値を使用
    ({ larkDomain, receiveIdType, receiveId } = preferences as Prefs);
  } else {
    // 通常のPreferencesから読み込み
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain, receiveIdType, receiveId } = prefs);
  }
  if (!receiveId || !receiveIdType) throw new Error("Preferences未設定（receiveId/receiveIdType）");

  // Chat IDの形式を確認し、適切なreceive_id_typeを設定
  let actualReceiveIdType = receiveIdType;
  if (receiveId.startsWith("oc_")) {
    // oc_で始まるIDはグループチャットのChat ID
    actualReceiveIdType = "chat_id";
    console.log("🔄 グループチャットのChat IDを検出、receive_id_typeをchat_idに設定");
  } else if (receiveId.includes("@")) {
    // @を含むIDはメールアドレス
    actualReceiveIdType = "email";
    console.log("🔄 メールアドレスを検出、receive_id_typeをemailに設定");
  } else if (receiveId.startsWith("ou_")) {
    // ou_で始まるIDはopen_id
    actualReceiveIdType = "open_id";
    console.log("🔄 Open IDを検出、receive_id_typeをopen_idに設定");
  }

  const url = buildUrl(
    larkDomain,
    `/open-apis/im/v1/messages?receive_id_type=${actualReceiveIdType}`
  );

  console.log("📮 送信するテキスト内容:", text);
  console.log("🏷️ テキストの長さ:", text.length);
  console.log("🎯 送信先ID:", receiveId);
  console.log("🔧 使用するreceive_id_type:", actualReceiveIdType);

  const body = { receive_id: receiveId, msg_type: "text", content: JSON.stringify({ text }) };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: any = await res.json();
  if (!res.ok || (data && data.code)) {
    console.error("❌ 送信エラー詳細:", {
      status: res.status,
      code: data?.code,
      msg: data?.msg,
      receiveId,
      actualReceiveIdType,
      url,
    });
    throw new Error(`send message error: ${data?.code ?? res.status} ${data?.msg ?? ""}`);
  }
  console.log("✅ メッセージ送信成功");
  return data;
}

export async function uploadFile(
  token: string,
  fileData: string,
  fileName: string,
  fileType: string
): Promise<string> {
  console.log("📤 uploadFile called:", { fileName, fileType, dataLength: fileData.length });

  const larkDomain = getPreferenceValues<Prefs>().larkDomain;
  const isImage = fileType.startsWith("image/");
  const endpoint = isImage ? "/open-apis/im/v1/images" : "/open-apis/im/v1/files";
  const url = buildUrl(larkDomain, endpoint);

  console.log("📤 Upload URL:", url, "| isImage:", isImage);

  try {
    // Base64データをBlobに変換
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: fileType });

    console.log("📤 Blob created:", { size: blob.size, type: blob.type });

    // FormDataを作成
    const formData = new FormData();

    if (isImage) {
      // 画像の場合は /open-apis/im/v1/images エンドポイント用のパラメータ
      formData.append("image_type", "message");
      formData.append("image", blob, fileName);
    } else {
      // ファイルの場合は /open-apis/im/v1/files エンドポイント用のパラメータ
      // 試行1: 標準的なパラメータ名を使用
      formData.append("file_type", "stream");
      formData.append("file_name", fileName);
      formData.append("file", blob, fileName);
    }

    console.log("📤 FormData prepared for", isImage ? "image" : "file", "endpoint");
    console.log("📤 FormData details:");
    if (isImage) {
      console.log(`  image_type: message`);
      console.log(`  image: Blob (size: ${blob.size}, type: ${blob.type})`);
    } else {
      console.log(`  file_type: stream`);
      console.log(`  file_name: ${fileName}`);
      console.log(`  file: Blob (size: ${blob.size}, type: ${blob.type})`);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Content-Typeは自動設定されるため明示的に設定しない
      },
      body: formData,
    });

    console.log("📤 Upload response status:", res.status);
    console.log("📤 Upload response headers:", {
      "content-type": res.headers.get("content-type"),
      "content-length": res.headers.get("content-length"),
    });

    const responseText = await res.text();
    console.log("📤 Upload response text:", responseText);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("📤 JSON parse error:", parseError);
      throw new Error(`レスポンスのJSONパースに失敗: ${responseText}`);
    }

    console.log("📤 Upload response data:", data);

    if (!res.ok) {
      const errorMsg = `ファイルアップロードエラー: HTTP ${res.status} ${res.statusText} - ${data?.msg || responseText}`;
      console.error("📤 Upload HTTP error:", errorMsg);
      throw new Error(errorMsg);
    }

    if (data && data.code && data.code !== 0) {
      const errorMsg = `ファイルアップロードエラー: ${data.code} ${data.msg || ""}`;
      console.error("📤 Upload API error:", errorMsg);
      throw new Error(errorMsg);
    }

    // レスポンスからキーを取得（画像とファイルで異なる）
    let fileKey: string;

    if (isImage) {
      // 画像の場合は image_key を期待
      if (!data || !data.data || !data.data.image_key) {
        const errorMsg = `画像アップロード応答が不正: image_keyが見つかりません`;
        console.error("📤 Upload response error:", errorMsg);
        throw new Error(errorMsg);
      }
      fileKey = data.data.image_key;
      console.log("📤 Upload successful, image_key:", fileKey);
    } else {
      // ファイルの場合は file_key を期待
      if (!data || !data.data || !data.data.file_key) {
        const errorMsg = `ファイルアップロード応答が不正: file_keyが見つかりません`;
        console.error("📤 Upload response error:", errorMsg);
        throw new Error(errorMsg);
      }
      fileKey = data.data.file_key;
      console.log("📤 Upload successful, file_key:", fileKey);
    }

    return fileKey;
  } catch (error) {
    console.error("📤 Upload exception:", error);
    throw error;
  }
}

export async function sendFileMessage(
  token: string,
  fileKey: string,
  fileName: string,
  fileType: string,
  preferences?: Partial<Prefs>
) {
  console.log("📨 sendFileMessage called:", { fileKey, fileName, fileType });

  let larkDomain: string, receiveIdType: string, receiveId: string;

  if (preferences && preferences.larkDomain && preferences.receiveIdType && preferences.receiveId) {
    ({ larkDomain, receiveIdType, receiveId } = preferences as Prefs);
  } else {
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain, receiveIdType, receiveId } = prefs);
  }

  if (!larkDomain || !receiveIdType || !receiveId) {
    throw new Error("Preferences未設定（larkDomain/receiveIdType/receiveId）");
  }

  // Chat IDの形式を確認し、適切なreceive_id_typeを設定
  let actualReceiveIdType = receiveIdType;
  if (receiveId.startsWith("oc_")) {
    // oc_で始まるIDはグループチャットのChat ID
    actualReceiveIdType = "chat_id";
    console.log("🔄 グループチャットのChat IDを検出、receive_id_typeをchat_idに設定");
  } else if (receiveId.includes("@")) {
    // @を含むIDはメールアドレス
    actualReceiveIdType = "email";
    console.log("🔄 メールアドレスを検出、receive_id_typeをemailに設定");
  } else if (receiveId.startsWith("ou_")) {
    // ou_で始まるIDはopen_id
    actualReceiveIdType = "open_id";
    console.log("🔄 Open IDを検出、receive_id_typeをopen_idに設定");
  }

  console.log("📨 Send config:", { larkDomain, receiveIdType: actualReceiveIdType, receiveId });

  const url = buildUrl(
    larkDomain,
    `/open-apis/im/v1/messages?receive_id_type=${actualReceiveIdType}`
  );
  console.log("📨 Send URL:", url);

  const messageType = fileType.startsWith("image/") ? "image" : "file";
  const content =
    messageType === "image"
      ? JSON.stringify({ image_key: fileKey })
      : JSON.stringify({ file_key: fileKey });

  console.log("📨 Message payload:", { messageType, content });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: messageType,
        content: content,
      }),
    });

    console.log("📨 Send response status:", res.status);

    const data: any = await res.json();
    console.log("📨 Send response data:", data);

    if (!res.ok || (data && data.code)) {
      const errorMsg = `ファイル送信エラー: ${data?.code ?? res.status} ${data?.msg ?? ""}`;
      console.error("📨 Send error:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("📨 File message sent successfully");
    return data;
  } catch (error) {
    console.error("📨 Send exception:", error);
    throw error;
  }
}

// Bot情報を取得する関数（キャッシュ機能付き）
export async function getBotInfo(
  token: string,
  preferences?: Partial<Prefs>
): Promise<ChatInfo | null> {
  console.log("🤖 getBotInfo called");

  let larkDomain: string, appId: string, receiveId: string;

  if (preferences && preferences.larkDomain && preferences.appId && preferences.receiveId) {
    ({ larkDomain, appId, receiveId } = preferences as Prefs);
  } else {
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain, appId, receiveId } = prefs);
  }

  if (!larkDomain || !appId || !receiveId) {
    throw new Error("Preferences未設定（larkDomain, appId, receiveId）");
  }

  try {
    const url = buildUrl(larkDomain, "/open-apis/bot/v3/info");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data: any = await res.json();
    if (!res.ok || (data && data.code)) {
      console.warn(`get bot info warning: ${data?.code ?? res.status} ${data?.msg ?? ""}`);
      return null;
    }

    const botInfo = data.data?.bot;
    if (botInfo) {
      const chatInfo: ChatInfo = {
        chat_id: `bot_${botInfo.open_id || "default"}`,
        name: `🤖 ${botInfo.app_name || "Bot"}`,
        description: "連携アプリのBot",
        chat_type: "bot" as const,
        avatar: botInfo.avatar_url,
        is_default: true,
      };

      // Bot情報をキャッシュに保存
      await saveCachedBotInfo(chatInfo, appId, receiveId);

      return chatInfo;
    }
  } catch (error) {
    console.warn("Bot情報の取得に失敗:", error);
  }

  return null;
}

// キャッシュされたBot情報を即座に取得する関数
export async function getCachedBotInfoForDisplay(
  preferences?: Partial<Prefs>
): Promise<ChatInfo | null> {
  let appId: string, receiveId: string;

  if (preferences && preferences.appId && preferences.receiveId) {
    ({ appId, receiveId } = preferences as Prefs);
  } else {
    const prefs = getPreferenceValues<Prefs>();
    ({ appId, receiveId } = prefs);
  }

  if (!appId || !receiveId) {
    return null;
  }

  return await getCachedBotInfo(appId, receiveId);
}

export async function getChatList(
  token: string,
  preferences?: Partial<Prefs>
): Promise<ChatInfo[]> {
  console.log("🚀 getChatList called - 包括的な調査開始");

  let larkDomain: string, appId: string, appSecret: string;

  if (preferences && preferences.larkDomain) {
    ({ larkDomain } = preferences as Prefs);
    const prefs = preferences || getPreferenceValues<Prefs>();
    appId = prefs.appId;
    appSecret = prefs.appSecret;
  } else {
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain, appId, appSecret } = prefs);
  }

  if (!larkDomain) {
    throw new Error("Preferences未設定（larkDomain）");
  }

  // API権限とスコープの詳細確認
  console.log("🔐 API権限とスコープの確認:");
  console.log(`  - App ID: ${appId ? appId.substring(0, 8) + "..." : "未設定"}`);
  console.log(`  - App Secret: ${appSecret ? "設定済み" : "未設定"}`);
  console.log(`  - Lark Domain: ${larkDomain}`);
  console.log(`  - Token: ${token ? token.substring(0, 20) + "..." : "未設定"}`);

  const chats: ChatInfo[] = [];

  // 1. 設定されたreceiveIdがある場合、まずキャッシュからBot情報を取得して即座に表示
  try {
    const prefs = preferences || getPreferenceValues<Prefs>();
    if (prefs.receiveId && prefs.receiveIdType) {
      console.log(`🔧 設定されたreceiveId: ${prefs.receiveId}, タイプ: ${prefs.receiveIdType}`);

      // まずキャッシュからBot情報を取得（即座に表示）
      const cachedBotInfo = await getCachedBotInfo(prefs.appId, prefs.receiveId);

      if (cachedBotInfo) {
        // キャッシュされたBot情報がある場合、即座に表示
        console.log(`⚡ キャッシュからBot情報を即座に表示: ${cachedBotInfo.name}`);
        const defaultBotChat: ChatInfo = {
          chat_id: prefs.receiveId, // 設定されたreceiveIdをそのまま使用
          name: "LarkCast", // 絵文字を削除、UIで表示時にアイコンを設定
          description: "設定で指定された送信先（デフォルト）",
          chat_type: "bot" as const,
          avatar: cachedBotInfo.avatar,
          is_default: true,
        };
        chats.push(defaultBotChat);
        console.log(
          `🤖 キャッシュからデフォルトBotを追加: ${defaultBotChat.name} (${defaultBotChat.chat_id})`
        );

        // バックグラウンドでBot情報を更新（非同期）
        (async () => {
          try {
            console.log(`🔄 バックグラウンドでBot情報を更新中...`);
            await getBotInfo(token, preferences);
            console.log(`✅ Bot情報のバックグラウンド更新完了`);
          } catch (error) {
            console.warn("バックグラウンドBot情報更新エラー:", error);
          }
        })();
      } else {
        // キャッシュがない場合、通常通りBot情報を取得
        console.log(`📡 キャッシュなし、Bot情報を取得中...`);
        const botInfo = await getBotInfo(token, preferences);
        console.log(`🤖 Bot情報取得結果:`, botInfo);

        if (botInfo && botInfo.name) {
          // Bot情報が取得できた場合、設定されたreceiveIdを使用してBot情報を作成
          console.log(`✅ Bot情報を使用: ${botInfo.name}`);
          const defaultBotChat: ChatInfo = {
            chat_id: prefs.receiveId, // 設定されたreceiveIdをそのまま使用
            name: "LarkCast", // 絵文字を削除、UIで表示時にアイコンを設定
            description: "設定で指定された送信先（デフォルト）",
            chat_type: "bot" as const,
            avatar: botInfo.avatar,
            is_default: true,
          };
          chats.push(defaultBotChat);
          console.log(`🤖 デフォルトBotを追加: ${defaultBotChat.name} (${defaultBotChat.chat_id})`);
        } else {
          // Bot情報が取得できない場合、LarkCastとして表示
          console.log(`⚠️ Bot情報取得失敗、フォールバック処理を実行`);
          const fallbackChat: ChatInfo = {
            chat_id: prefs.receiveId,
            name: "LarkCast", // 絵文字を削除、UIで表示時にアイコンを設定
            description: "設定で指定された送信先（デフォルト）",
            chat_type: "bot" as const, // フォールバックでもbotタイプに変更
            is_default: true,
          };
          chats.push(fallbackChat);
          console.log(`🤖 フォールバックBotを追加: ${fallbackChat.name} (${fallbackChat.chat_id})`);
        }
      }
    }
  } catch (error) {
    console.warn("デフォルト送信先の設定エラー:", error);
  }

  // 2. 複数のアプローチでチャット一覧を取得
  console.log("🔍 複数のアプローチでチャット一覧を取得開始");

  // アプローチ1: 最小限のパラメータで全チャット取得
  await fetchChatsWithApproach(
    "最小限パラメータ",
    {
      page_size: "100", // ページサイズを増加
    },
    token,
    larkDomain,
    chats
  );

  // アプローチ2: グループチャットのみ取得
  await fetchChatsWithApproach(
    "グループチャットのみ",
    {
      page_size: "100",
      chat_type: "group",
    },
    token,
    larkDomain,
    chats
  );

  // アプローチ3: メンバーシップ条件付きで取得
  await fetchChatsWithApproach(
    "メンバーシップ条件付き",
    {
      page_size: "100",
      membership: "member",
    },
    token,
    larkDomain,
    chats
  );

  // アプローチ4: 個人チャット取得
  await fetchChatsWithApproach(
    "個人チャット",
    {
      page_size: "100",
      chat_type: "p2p",
    },
    token,
    larkDomain,
    chats
  );

  // 3. 代替エンドポイントの試行
  console.log("🔄 代替エンドポイントの試行");
  await tryAlternativeEndpoints(token, larkDomain, chats);

  console.log(`📋 最終的に取得したチャット数: ${chats.length}`);

  // 全チャットの詳細リストを出力
  console.log(`🔍 全チャット一覧:`);
  chats.forEach((chat, index) => {
    console.log(
      `  ${index + 1}. ${chat.name} (${chat.chat_id}) - Type: ${chat.chat_type}, Default: ${chat.is_default}`
    );

    // SkillFreak大改修PJの最終チェック
    if (
      chat.name.includes("SkillFreak") ||
      chat.name.includes("大改修") ||
      chat.name.includes("PJ")
    ) {
      console.log(`🎯 最終チェック - 関連チャット発見: ${chat.name} (${chat.chat_id})`);
    }
  });

  // ユーザーへの説明用ログ
  const defaultChats = chats.filter((chat) => chat.is_default);
  const groupChats = chats.filter((chat) => chat.chat_type === "group" && !chat.is_default);
  const p2pChats = chats.filter((chat) => chat.chat_type === "p2p" && !chat.is_default);

  console.log(`🤖 デフォルトBot: ${defaultChats.length}件`);
  console.log(`👥 グループチャット: ${groupChats.length}件`);
  console.log(`👤 個人チャット: ${p2pChats.length}件`);

  // SkillFreak大改修PJが見つからない場合の警告
  const skillFreakChat = chats.find(
    (chat) =>
      chat.name.includes("SkillFreak") && chat.name.includes("大改修") && chat.name.includes("PJ")
  );

  if (!skillFreakChat) {
    console.warn(`⚠️ 「SkillFreak大改修PJ」チャットが見つかりませんでした`);
    console.warn(`🔍 取得したグループチャット一覧:`);
    groupChats.forEach((chat) => {
      console.warn(`  - ${chat.name} (${chat.chat_id})`);
    });

    // 特別検索: SkillFreakを含む全チャットを検索
    console.warn(`🔍 SkillFreakを含む全チャットの検索:`);
    const skillFreakRelated = chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes("skill") ||
        chat.name.toLowerCase().includes("freak") ||
        chat.name.includes("改修") ||
        chat.name.includes("PJ") ||
        chat.name.includes("プロジェクト")
    );
    skillFreakRelated.forEach((chat) => {
      console.warn(`  - 関連可能性: ${chat.name} (${chat.chat_id})`);
    });
  } else {
    console.log(
      `✅ 「SkillFreak大改修PJ」チャットを発見: ${skillFreakChat.name} (${skillFreakChat.chat_id})`
    );
  }

  if (chats.length === 1 && defaultChats.length === 1) {
    console.log(
      "ℹ️ ボットが参加しているチャットのみ表示されます。他のチャットを表示するには、グループチャットにボットを追加してください。"
    );
  }

  return chats;
}

// ヘルパー関数: 指定されたアプローチでチャットを取得
async function fetchChatsWithApproach(
  approachName: string,
  params: Record<string, string>,
  token: string,
  larkDomain: string,
  chats: ChatInfo[]
): Promise<void> {
  console.log(`🔍 アプローチ「${approachName}」でチャット取得開始`);

  try {
    let pageToken = "";
    let hasMore = true;
    const maxPages = 10; // 最大10ページまで取得
    let currentPage = 0;
    let totalFetched = 0;

    while (hasMore && currentPage < maxPages) {
      const requestParams = new URLSearchParams({
        ...params,
        ...(pageToken && { page_token: pageToken }),
      });

      console.log(
        `🔍 ${approachName} - ページ ${currentPage + 1} のリクエストパラメータ:`,
        requestParams.toString()
      );

      const url = buildUrl(larkDomain, `/open-apis/im/v1/chats?${requestParams}`);
      console.log(`🔗 リクエストURL: ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`📡 ${approachName} - レスポンスヘッダー:`, res.headers);

      const data: any = await res.json();

      // APIレスポンスの完全ログ出力
      console.log(`🔍 ${approachName} - API Response Status: ${res.status}`);
      console.log(`🔍 ${approachName} - API Response Data:`, JSON.stringify(data, null, 2));

      if (!res.ok || (data && data.code)) {
        console.warn(`${approachName} - エラー: ${data?.code ?? res.status} ${data?.msg ?? ""}`);
        console.warn(`🔍 ${approachName} - Full error response:`, data);

        // エラーでも継続処理
        if (data?.code === 99991663) {
          console.warn(`${approachName} - 権限不足エラー、次のアプローチを試行`);
        }
        break;
      } else {
        console.log(`✅ ${approachName} - ページ ${currentPage + 1} のAPIレスポンス成功`);
        console.log(`📊 ${approachName} - 取得したアイテム数: ${data.data?.items?.length || 0}`);
        console.log(`📄 ${approachName} - has_more: ${data.data?.has_more}`);
        console.log(`🔗 ${approachName} - page_token: ${data.data?.page_token || "なし"}`);

        // 生のチャットデータをログ出力
        if (data.data?.items) {
          console.log(`🔍 ${approachName} - 生のチャットデータ:`);
          data.data.items.forEach((chat: any, index: number) => {
            console.log(
              `  ${index + 1}. ID: ${chat.chat_id}, Name: "${chat.name}", Type: ${chat.chat_type}, Description: "${chat.description || "なし"}"`
            );

            // SkillFreak大改修PJを明示的にチェック
            if (
              chat.name &&
              (chat.name.includes("SkillFreak") ||
                chat.name.includes("大改修") ||
                chat.name.includes("PJ"))
            ) {
              console.log(
                `🎯 ${approachName} - SkillFreak関連チャットを発見: ${chat.name} (${chat.chat_id})`
              );
            }
          });
        }

        // APIレスポンスからChatInfo形式に変換
        const apiChats: ChatInfo[] = (data.data?.items || []).map((chat: any) => {
          // Chat IDの形式に基づいてchat_typeを決定
          let chatType = chat.chat_type || "group";
          if (chat.chat_id && chat.chat_id.startsWith("oc_")) {
            chatType = "group"; // oc_で始まるIDはグループチャット
          } else if (chat.chat_id && chat.chat_id.includes("@")) {
            chatType = "p2p"; // メールアドレス形式は個人チャット
          } else if (chat.chat_id && chat.chat_id.startsWith("ou_")) {
            chatType = "p2p"; // ou_で始まるIDは個人チャット
          }

          const chatInfo = {
            chat_id: chat.chat_id,
            name: chat.name || chat.chat_id,
            description: chat.description,
            chat_type: chatType,
            avatar: chat.avatar,
            is_default: false,
          };

          console.log(
            `🔄 ${approachName} - 変換後のチャット情報: ${chatInfo.name} (${chatInfo.chat_id}) - Type: ${chatInfo.chat_type}`
          );

          return chatInfo;
        });

        // 重複を避けて追加
        apiChats.forEach((apiChat) => {
          const existingChat = chats.find((chat) => chat.chat_id === apiChat.chat_id);
          if (!existingChat) {
            chats.push(apiChat);
            totalFetched++;
            console.log(
              `➕ ${approachName} - 新しいチャットを追加: ${apiChat.name} (${apiChat.chat_id})`
            );
          } else {
            console.log(
              `🔄 ${approachName} - 既存チャット: ${existingChat.name} (${apiChat.chat_id})`
            );
          }
        });

        // 次のページがあるかチェック
        pageToken = data.data?.page_token || "";
        hasMore = data.data?.has_more || false;
        currentPage++;

        console.log(
          `📄 ${approachName} - ページ ${currentPage}: ${apiChats.length}件のチャットを処理`
        );
      }
    }

    console.log(`✅ ${approachName} - 完了: ${totalFetched}件の新しいチャットを追加`);
  } catch (error) {
    console.warn(`${approachName} - チャット一覧取得エラー:`, error);
  }
}

// ヘルパー関数: 代替エンドポイントの試行
async function tryAlternativeEndpoints(
  token: string,
  larkDomain: string,
  chats: ChatInfo[]
): Promise<void> {
  // 代替エンドポイント1: チャットメンバー一覧から逆引き
  try {
    console.log("🔄 代替アプローチ: Bot情報からチャット検索");

    // Bot自身の情報を取得
    const botInfoUrl = buildUrl(larkDomain, "/open-apis/bot/v3/info/");
    const botRes = await fetch(botInfoUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const botData = await botRes.json();
    console.log("🤖 Bot情報:", JSON.stringify(botData, null, 2));
  } catch (error) {
    console.warn("代替エンドポイント1エラー:", error);
  }

  // 代替エンドポイント2: 検索API（もし利用可能であれば）
  try {
    console.log("🔄 代替アプローチ: 検索APIでSkillFreakを検索");

    const searchUrl = buildUrl(larkDomain, "/open-apis/search/v2/message");
    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "SkillFreak",
        page_size: 20,
      }),
    });

    const searchData = await searchRes.json();
    console.log("🔍 検索結果:", JSON.stringify(searchData, null, 2));
  } catch (error) {
    console.warn("代替エンドポイント2エラー:", error);
  }
}

// メッセージ履歴を取得する関数
export async function getMessages(
  token: string,
  chatId: string,
  preferences?: Partial<Prefs>
): Promise<any[]> {
  let larkDomain: string;

  if (preferences && preferences.larkDomain) {
    ({ larkDomain } = preferences as Prefs);
  } else {
    const prefs = getPreferenceValues<Prefs>();
    ({ larkDomain } = prefs);
  }

  if (!larkDomain) {
    throw new Error("Preferences未設定（larkDomain）");
  }

  try {
    const params = new URLSearchParams({
      container_id_type: "chat_id",
      container_id: chatId,
      page_size: "10", // 最新10件を取得
    });

    const url = buildUrl(larkDomain, `/open-apis/im/v1/messages?${params}`);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data: any = await res.json();
    if (!res.ok || (data && data.code)) {
      console.warn(`get messages warning: ${data?.code ?? res.status} ${data?.msg ?? ""}`);
      return [];
    }

    return data.data?.items || [];
  } catch (error) {
    console.warn("メッセージ取得エラー:", error);
    return [];
  }
}

// ===== Lark Tasks API v1.1.0 統合関数 =====

/**
 * タスク作成とメッセージ送信を統合した関数
 * タスクを作成し、指定されたチャットに通知メッセージを送信
 */
export async function createTaskAndNotify(
  taskData: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: "low" | "medium" | "high" | "urgent";
    assigneeId?: string;
    tasklistGuid?: string;
    reminderMinutes?: number;
  },
  notificationOptions?: {
    chatId?: string;
    sendNotification?: boolean;
    customMessage?: string;
  },
  preferences?: Partial<Prefs>
): Promise<{ task: any; messageId?: string }> {
  try {
    // 1. タスクを作成
    const { createTask } = await import("./api/task-api");
    const task = await createTask(taskData);

    console.log("✅ タスクが作成されました:", task.summary);

    // 2. 通知メッセージを送信（オプション）
    let messageId: string | undefined;
    if (notificationOptions?.sendNotification && notificationOptions.chatId) {
      const priorityEmoji = {
        low: "🔵",
        medium: "⚪",
        high: "🟡",
        urgent: "🔴",
      }[taskData.priority || "medium"];

      const dueDateText = taskData.dueDate
        ? `\n📅 締切: ${taskData.dueDate.toLocaleDateString("ja-JP")}`
        : "";

      const assigneeText = taskData.assigneeId ? `\n👤 担当者: ${taskData.assigneeId}` : "";

      const defaultMessage =
        `${priorityEmoji} **新しいタスクが作成されました**\n\n` +
        `📝 **${task.summary}**${dueDateText}${assigneeText}\n\n` +
        `${taskData.description || ""}`;

      const message = notificationOptions.customMessage || defaultMessage;

      try {
        const token = await getTenantAccessToken();
        messageId = await sendTextMessage(token, message, notificationOptions.chatId, preferences);
        console.log("📤 通知メッセージを送信しました");
      } catch (error) {
        console.warn("通知メッセージの送信に失敗しました:", error);
      }
    }

    return { task, messageId };
  } catch (error) {
    console.error("タスク作成エラー:", error);
    throw error;
  }
}

/**
 * タスクリスト一覧を取得（キャッシュ対応）
 */
let tasklistCache: { tasklists: any[]; timestamp: number } | null = null;
const TASKLIST_CACHE_DURATION = 5 * 60 * 1000; // 5分

export async function getTasklistsWithCache(forceRefresh: boolean = false): Promise<any[]> {
  // キャッシュチェック
  if (
    !forceRefresh &&
    tasklistCache &&
    Date.now() - tasklistCache.timestamp < TASKLIST_CACHE_DURATION
  ) {
    return tasklistCache.tasklists;
  }

  try {
    const { getAllTasklists } = await import("./api/tasklist-api");
    const tasklists = await getAllTasklists();

    // キャッシュ更新
    tasklistCache = {
      tasklists,
      timestamp: Date.now(),
    };

    console.log(`📋 ${tasklists.length}個のタスクリストを取得しました`);
    return tasklists;
  } catch (error) {
    console.error("タスクリスト取得エラー:", error);
    return [];
  }
}

/**
 * ユーザー検索（キャッシュ対応）
 */
export async function searchUsersWithCache(query: string, limit: number = 10): Promise<any[]> {
  try {
    const { getUserSuggestions } = await import("./api/user-api");
    const users = await getUserSuggestions(query, limit);

    console.log(`👥 ${users.length}人のユーザーを検索しました`);
    return users;
  } catch (error) {
    console.error("ユーザー検索エラー:", error);
    return [];
  }
}

/**
 * タスク作成の権限チェック
 */
export async function checkTaskPermissions(): Promise<{
  canCreateTask: boolean;
  canAccessTasklists: boolean;
  canSearchUsers: boolean;
  errors: string[];
}> {
  const result = {
    canCreateTask: false,
    canAccessTasklists: false,
    canSearchUsers: false,
    errors: [] as string[],
  };

  try {
    // アクセストークンの取得テスト
    const token = await getTenantAccessToken();
    if (!token) {
      result.errors.push("アクセストークンの取得に失敗しました");
      return result;
    }

    // タスクリスト取得テスト
    try {
      const { getTasklists } = await import("./api/tasklist-api");
      await getTasklists(1); // 1件だけ取得してテスト
      result.canAccessTasklists = true;
    } catch (error) {
      result.errors.push(`タスクリストアクセス権限なし: ${error}`);
    }

    // ユーザー検索テスト
    try {
      const { getCurrentUser } = await import("./api/user-api");
      await getCurrentUser();
      result.canSearchUsers = true;
    } catch (error) {
      result.errors.push(`ユーザー検索権限なし: ${error}`);
    }

    // タスク作成権限は、タスクリストアクセスができれば基本的に可能
    result.canCreateTask = result.canAccessTasklists;

    if (result.errors.length === 0) {
      console.log("✅ すべてのタスク機能の権限チェックが完了しました");
    } else {
      console.warn("⚠️ 一部の機能で権限エラーがあります:", result.errors);
    }

    return result;
  } catch (error) {
    result.errors.push(`権限チェック中にエラーが発生しました: ${error}`);
    return result;
  }
}
