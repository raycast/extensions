import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
  Detail,
  openExtensionPreferences,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readFileSync, statSync } from "fs";
import { basename, extname } from "path";
import { getCachedDefaultBotName, setCachedDefaultBotName } from "../utils";
import {
  getTenantAccessToken,
  sendTextMessage,
  getChatList,
  ChatInfo,
  uploadFile,
  sendFileMessage,
} from "../lark";
import { getSetupStatus } from "../utils/setup-checker";
import { getEffectivePreferences, isEffectiveSetupComplete } from "../utils/preferences";
import SettingsManager from "../settings-manager";
import TemplateManager from "../template-manager";
import MessageHistoryManager from "../message-history";
import OnboardingWizard from "../onboarding";
import { Language, getTranslation } from "../locales/translations";
import {
  MemoTemplate,
  getTemplates,
  getTemplateById,
  setSelectedTemplate,
  getSelectedTemplateId,
  replaceTemplateVariables,
} from "../utils/template-manager";
import { addMessageToHistory, getRecentChatOrder } from "../utils/message-history";
import {
  AttachedFile,
  formatFileSize,
  getMimeType,
  removeFileById,
  getTotalFileSize,
  getTotalSizeLimit,
  getFileIcon,
} from "../utils/file-attachment";
import { CustomChatManager, CustomChat } from "../custom-chats";
import AddCustomChat from "../add-custom-chat";
import ManageCustomChats from "../manage-custom-chats";
import ChatSetupGuide from "../chat-setup-guide";

interface MemoFormProps {
  language: Language;
}

export default function MemoForm({ language }: MemoFormProps) {
  const { push } = useNavigation();
  const [chatList, setChatList] = useState<ChatInfo[]>([]);
  const [customChats, setCustomChats] = useState<CustomChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>("bot"); // デフォルトでBotを選択
  const [loadingChats, setLoadingChats] = useState(true);

  // セットアップ状況の状態
  const [setupComplete, setSetupComplete] = useState<boolean>(true); // デフォルトでtrueに設定
  const [setupChecking] = useState<boolean>(false); // 初期状態では非チェック
  const [, setSetupError] = useState<string>("");

  // テンプレート関連の状態
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateIdState] = useState<string>("");
  const [memoContent, setMemoContent] = useState<string>("");

  // ファイル添付関連の状態
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // デフォルトbotの名前を取得する状態
  const [defaultBotName, setDefaultBotName] = useState<string>("LarkCast");

  const t = getTranslation(language);

  // 初期化処理 - 非同期で背景実行
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // キャッシュからBot名を即座に読み込み
        const cachedName = await getCachedDefaultBotName();
        // アプリ名がLarkCastなので、デフォルトでLarkCastを設定
        const displayName = cachedName === "Bot (デフォルト)" ? "LarkCast" : cachedName;
        setDefaultBotName(displayName);

        // 古いキャッシュの場合は「LarkCast」で更新
        if (cachedName === "Bot (デフォルト)") {
          await setCachedDefaultBotName("LarkCast");
        }

        // テンプレート読み込み
        await loadTemplates();
        await loadCustomChats();

        await backgroundInitialization();
      } catch (error) {
        console.error("初期化エラー:", error);
      }
    };

    initializeComponent();
  }, []);

  // 背景での初期化処理
  const backgroundInitialization = async () => {
    try {
      // 設定確認を非同期で実行
      const effectivePrefs = await getEffectivePreferences();
      const isComplete = await isEffectiveSetupComplete(effectivePrefs);
      setSetupComplete(isComplete);

      if (isComplete) {
        await loadChatList();
        setSetupError("");
      } else {
        const setupStatus = await getSetupStatus();
        const missingFields = setupStatus.missingFields.join(", ");
        setSetupError(`設定が不完全です。不足項目: ${missingFields}`);

        // エラートーストは表示するが、UIはブロックしない
        await showToast({
          style: Toast.Style.Failure,
          title: "設定が不完全です",
          message: "Extension Preferencesで設定を完了してください",
        });
      }
    } catch (error) {
      console.error("backgroundInitialization: 背景初期化エラー:", error);
      setSetupError(`設定チェック中にエラーが発生しました: ${String(error)}`);
      setSetupComplete(false);
    }
  };

  // テンプレート一覧を読み込む関数
  const loadTemplates = async () => {
    try {
      const allTemplates = await getTemplates();
      setTemplates(allTemplates);

      // 前回選択されたテンプレートを復元
      const lastSelectedId = await getSelectedTemplateId();
      if (lastSelectedId) {
        setSelectedTemplateIdState(lastSelectedId);
        const template = allTemplates.find((t) => t.id === lastSelectedId);
        if (template) {
          setMemoContent(replaceTemplateVariables(template.content));
        }
      }
    } catch (error) {
      console.error("テンプレート読み込みエラー:", error);
    }
  };

  // テンプレート選択時の処理
  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateIdState(templateId);
    await setSelectedTemplate(templateId);

    if (templateId) {
      const template = await getTemplateById(templateId);
      if (template) {
        setMemoContent(replaceTemplateVariables(template.content));
      }
    } else {
      setMemoContent("");
    }
  };

  // カスタムチャット読み込み
  const loadCustomChats = async () => {
    try {
      console.log("🔍 [DEBUG] loadCustomChats: 開始");
      const chats = await CustomChatManager.getCustomChats();
      console.log("🔍 [DEBUG] loadCustomChats: 取得したカスタムチャット数:", chats.length);
      console.log("🔍 [DEBUG] loadCustomChats: カスタムチャット詳細:", chats);
      setCustomChats(chats);
      console.log("🔍 [DEBUG] loadCustomChats: setCustomChats完了");
      console.log(`📋 ${chats.length}件のカスタムチャットを読み込みました`);

      // デフォルトbotの名前を更新（カスタムチャットからbotタイプを探す）
      // 注意: LarkCastがアプリ名なので、webhookタイプのbotが見つかってもLarkCastを維持
      const customBot = chats.find((chat) => chat.type === "webhook");
      if (customBot && defaultBotName === "LarkCast") {
        // webhookタイプのbotが見つかった場合でも、アプリ名「LarkCast」を維持します
        console.log(
          `🤖 webhookタイプのbot「${customBot.name}」が見つかりましたが、アプリ名「LarkCast」を維持します`
        );
      }
    } catch (error) {
      console.error("カスタムチャット読み込みエラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "カスタムチャット読み込み失敗",
        message: String(error),
      });
    }
  };

  // チャット一覧読み込み
  const loadChatList = async () => {
    try {
      console.log("🔄 loadChatList: チャット一覧読み込み開始");
      setLoadingChats(true);
      console.log("🔄 loadChatList: チャット一覧を読み込み中...");

      const effectivePrefs = await getEffectivePreferences();
      console.log("🔍 loadChatList: 有効な設定を取得:", effectivePrefs);

      const accessToken = await getTenantAccessToken(effectivePrefs);
      console.log("🔍 loadChatList: アクセストークン取得:", accessToken ? "成功" : "失敗");

      if (!accessToken) {
        throw new Error(
          "アクセストークンの取得に失敗しました。App IDとApp Secretを確認してください。"
        );
      }

      console.log("🚀 loadChatList: getChatList関数を呼び出します");
      const chats = await getChatList(accessToken, effectivePrefs);
      console.log(`📋 loadChatList: ${chats.length}件のチャットを取得しました`);

      // デフォルトbotの名前を設定してキャッシュに保存
      // 注意: アプリ名「LarkCast」を維持するため、実際のbot名での上書きは行わない
      const defaultBot = chats.find((chat) => chat.is_default);
      if (defaultBot) {
        console.log(
          `🤖 デフォルトbot「${defaultBot.name}」が見つかりましたが、アプリ名「LarkCast」を維持します`
        );
      } else {
        // カスタムチャットからbotタイプを探す
        const customBot = customChats.find((chat) => chat.type === "webhook");
        if (customBot) {
          console.log(
            `🤖 カスタムbot「${customBot.name}」が見つかりましたが、アプリ名「LarkCast」を維持します`
          );
        }
      }

      // アプリ名「LarkCast」をキャッシュに保存
      await setCachedDefaultBotName("LarkCast");
      console.log(`🤖 アプリ名「LarkCast」をキャッシュに保存しました`);

      // チャットを並び替え（Bot > 最近使用 > その他）
      const recentOrder = await getRecentChatOrder();
      const sortedChats = chats.sort((a, b) => {
        // Botチャットを最優先
        if (a.chat_type === "bot" && b.chat_type !== "bot") return -1;
        if (a.chat_type !== "bot" && b.chat_type === "bot") return 1;

        // 最近使用したチャットを優先
        const aIndex = recentOrder.indexOf(a.chat_id);
        const bIndex = recentOrder.indexOf(b.chat_id);

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex; // 最近使用した順
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // 名前順
        return a.name.localeCompare(b.name);
      });

      setChatList(sortedChats);

      // デフォルト選択 - 固定の「Bot」項目を維持
      if (sortedChats.length > 0) {
        // 現在の選択が"bot"（初期値）の場合は、固定の「Bot」項目を維持
        if (selectedChatId === "bot") {
          // 実際のBotチャットが見つかった場合でも、固定の「Bot」項目を維持
          console.log(`🤖 固定の「Bot」項目を維持します`);
        }
      }

      if (sortedChats.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "送信先が見つかりません",
          message: "ボットをグループチャットに追加するか、カスタムチャットを設定してください",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "チャット一覧更新完了",
          message: `${sortedChats.length}件のチャットを読み込みました`,
        });
      }
    } catch (error) {
      console.error("チャット一覧読み込みエラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "チャット一覧読み込み失敗",
        message: String(error),
      });
      setChatList([]); // エラー時は空のリストを設定
    } finally {
      setLoadingChats(false);
    }
  };

  // ファイル添付ハンドラー
  const handleAttachFiles = async (selectedFiles?: string[]) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    try {
      console.log("📎 Processing selected files:", selectedFiles);

      const newFiles: AttachedFile[] = [];

      for (const filePath of selectedFiles) {
        try {
          const stats = statSync(filePath);
          const fileName = basename(filePath);
          const fileExtension = extname(filePath).toLowerCase();
          const mimeType = getMimeType(filePath);

          // ファイルサイズチェック
          if (stats.size > 10 * 1024 * 1024) {
            await showToast({
              style: Toast.Style.Failure,
              title: "ファイルサイズエラー",
              message: `${fileName} は10MBを超えています`,
            });
            continue;
          }

          // Base64エンコード
          const fileData = readFileSync(filePath);
          const base64Data = fileData.toString("base64");

          const attachedFile: AttachedFile = {
            id: `${Date.now()}-${Math.random()}`,
            name: fileName,
            path: filePath,
            size: stats.size,
            type: fileExtension,
            data: base64Data,
            mimeType: mimeType,
            lastModified: stats.mtime,
          };

          newFiles.push(attachedFile);
          console.log("📎 File processed:", { name: fileName, size: stats.size, type: mimeType });
        } catch (error) {
          console.error("📎 Error processing file:", filePath, error);
          await showToast({
            style: Toast.Style.Failure,
            title: "ファイル処理エラー",
            message: `${basename(filePath)} の処理に失敗しました`,
          });
        }
      }

      if (newFiles.length > 0) {
        const allFiles = [...attachedFiles, ...newFiles];
        const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);

        if (totalSize > 50 * 1024 * 1024) {
          await showToast({
            style: Toast.Style.Failure,
            title: "合計サイズ制限エラー",
            message: "添付ファイルの合計サイズが50MBを超えています",
          });
          return;
        }

        setAttachedFiles(allFiles);
        await showToast({
          style: Toast.Style.Success,
          title: "ファイル添付完了",
          message: `${newFiles.length}個のファイルを添付しました`,
        });
      }
    } catch (error) {
      console.error("📎 File attachment error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "ファイル添付エラー",
        message: String(error),
      });
    }
  };

  // ファイル削除ハンドラー
  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => removeFileById(prev, fileId));
  };

  // 全ファイル削除ハンドラー
  const handleClearAllFiles = () => {
    setAttachedFiles([]);
  };

  // メッセージ送信処理
  const handleSubmit = async () => {
    if (!selectedChatId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "送信先未選択",
        message: "送信先のチャットを選択してください",
      });
      return;
    }

    if (!memoContent.trim() && attachedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "内容が空です",
        message: "メッセージまたはファイルを入力してください",
      });
      return;
    }

    try {
      const effectivePrefs = await getEffectivePreferences();
      // カスタムチャットかどうかを判定
      const customChat = customChats.find((chat) => chat.id === selectedChatId);

      if (customChat) {
        // カスタムチャットの場合
        if (customChat.type === "webhook") {
          // Webhook送信
          const response = await fetch(customChat.webhookUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              msg_type: "text",
              content: { text: memoContent },
            }),
          });

          if (!response.ok) {
            throw new Error(`Webhook送信失敗: ${response.status}`);
          }
        } else {
          // 通常のチャットID送信
          const accessToken = await getTenantAccessToken(effectivePrefs);
          const prefsWithReceiveId = { ...effectivePrefs, receiveId: customChat.chatId };
          await sendTextMessage(accessToken, memoContent, prefsWithReceiveId);
        }
      } else {
        // 通常のチャット送信
        let actualChatId = selectedChatId;

        // "bot"が選択されている場合は、実際のBotチャットを探すか、デフォルト設定を使用
        if (selectedChatId === "bot") {
          // 実際のBotチャットを探す
          const botChat = chatList.find((chat) => chat.chat_type === "bot");
          if (botChat) {
            actualChatId = botChat.chat_id;
            console.log(`🤖 固定Bot項目から実際のBotチャット「${botChat.name}」に送信します`);
          } else {
            // Botチャットが見つからない場合は、デフォルト設定を使用（receiveIdを空にしてデフォルト送信）
            actualChatId = "";
            console.log(`🤖 固定Bot項目からデフォルト設定で送信します`);
          }
        }

        if (attachedFiles.length > 0) {
          // ファイル付きメッセージ
          for (const file of attachedFiles) {
            const accessToken = await getTenantAccessToken(effectivePrefs);
            const fileKey = await uploadFile(
              accessToken,
              file.data,
              file.name,
              file.mimeType || "application/octet-stream"
            );

            if (actualChatId) {
              const prefsWithReceiveId = { ...effectivePrefs, receiveId: actualChatId };
              await sendFileMessage(
                accessToken,
                fileKey,
                file.name,
                file.mimeType || "application/octet-stream",
                prefsWithReceiveId
              );
            } else {
              // デフォルト設定で送信
              await sendFileMessage(
                accessToken,
                fileKey,
                file.name,
                file.mimeType || "application/octet-stream",
                effectivePrefs
              );
            }
          }

          if (memoContent.trim()) {
            const accessToken = await getTenantAccessToken(effectivePrefs);
            if (actualChatId) {
              const prefsWithReceiveId = { ...effectivePrefs, receiveId: actualChatId };
              await sendTextMessage(accessToken, memoContent, prefsWithReceiveId);
            } else {
              // デフォルト設定で送信
              await sendTextMessage(accessToken, memoContent, effectivePrefs);
            }
          }
        } else {
          // テキストのみ
          const accessToken = await getTenantAccessToken(effectivePrefs);
          if (actualChatId) {
            const prefsWithReceiveId = { ...effectivePrefs, receiveId: actualChatId };
            await sendTextMessage(accessToken, memoContent, prefsWithReceiveId);
          } else {
            // デフォルト設定で送信
            await sendTextMessage(accessToken, memoContent, effectivePrefs);
          }
        }
      }

      // 履歴に追加（成功）
      const destinationName =
        selectedChatId === "default"
          ? "デフォルト"
          : customChats.find((c) => c.id === selectedChatId)?.name ||
            chatList.find((c) => c.chat_id === selectedChatId)?.name ||
            selectedChatId;
      await addMessageToHistory(memoContent, selectedChatId, destinationName, true);

      await showToast({
        style: Toast.Style.Success,
        title: t.sent,
      });

      // フォームをリセット
      setMemoContent("");
      setAttachedFiles([]);
      await popToRoot();
    } catch (error) {
      console.error("送信エラー:", error);

      // 履歴に追加（失敗）
      const destinationName =
        selectedChatId === "default"
          ? "デフォルト"
          : customChats.find((c) => c.id === selectedChatId)?.name ||
            chatList.find((c) => c.chat_id === selectedChatId)?.name ||
            selectedChatId;
      await addMessageToHistory(memoContent, selectedChatId, destinationName, false, String(error));

      await showToast({
        style: Toast.Style.Failure,
        title: t.sendFailed,
        message: String(error),
      });
    }
  };

  // セットアップが不完全な場合の表示
  if (setupChecking) {
    return (
      <Detail
        markdown="# 🔍 設定を確認中...

設定状況をチェックしています。しばらくお待ちください。"
        isLoading={true}
      />
    );
  }

  if (!setupComplete) {
    // オンボーディングウィザードを表示
    return <OnboardingWizard />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={t.sendMemo}
            onAction={handleSubmit}
            icon={Icon.Airplane}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <ActionPanel.Section title="📋 テンプレート">
            <Action
              title="📝 テンプレート管理"
              icon={Icon.Document}
              onAction={() => push(<TemplateManager onTemplatesChanged={loadTemplates} />)}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="📜 履歴">
            <Action
              title="📜 メッセージ履歴"
              icon={Icon.List}
              onAction={() => push(<MessageHistoryManager />)}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="💬 カスタムチャット">
            <Action
              title="➕ カスタムチャット追加"
              icon={Icon.Plus}
              onAction={() => push(<AddCustomChat onChatAdded={loadCustomChats} />)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="⚙️ カスタムチャット管理"
              icon={Icon.Gear}
              onAction={() => push(<ManageCustomChats />)}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            <Action
              title="📖 チャット設定ガイド"
              icon={Icon.QuestionMark}
              onAction={() => push(<ChatSetupGuide />)}
            />
          </ActionPanel.Section>
          {attachedFiles.length > 0 && (
            <>
              <ActionPanel.Submenu
                title="📎 ファイル管理"
                icon={Icon.Paperclip}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              >
                <Action
                  title="🗑️ 全ファイル削除"
                  icon={Icon.Trash}
                  onAction={handleClearAllFiles}
                  style={Action.Style.Destructive}
                />
                <ActionPanel.Section title="個別削除">
                  {attachedFiles.map((file, index) => (
                    <Action
                      key={file.id}
                      title={`${index + 1}. ${file.name}`}
                      icon={getFileIcon(file)}
                      onAction={() => handleRemoveFile(file.id)}
                      style={Action.Style.Destructive}
                    />
                  ))}
                </ActionPanel.Section>
              </ActionPanel.Submenu>
            </>
          )}
          <Action
            title="🔄 チャット一覧を更新"
            icon={Icon.ArrowClockwise}
            onAction={loadChatList}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={`⚙️ ${t.linkSettings}`}
            icon={Icon.Gear}
            onAction={() => push(<SettingsManager />)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
          <Action title={t.changeSettings} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="template"
        title="📋 テンプレート"
        placeholder="テンプレートを選択（任意）"
        value={selectedTemplateId}
        onChange={handleTemplateChange}
      >
        <Form.Dropdown.Item value="" title="テンプレートなし" />
        {templates.map((template) => (
          <Form.Dropdown.Item
            key={template.id}
            value={template.id}
            title={template.name}
            icon={template.isPreset ? "🔧" : "📝"}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="destination"
        title="📤 送信先"
        placeholder={
          loadingChats
            ? "🔄 チャット一覧を読み込み中... (Botはすぐに利用可能)"
            : chatList.length === 0 && customChats.length === 0
              ? "❌ 送信先が見つかりません - カスタムチャットを追加してください"
              : chatList.length + customChats.length > 0
                ? `📤 送信先を選択 (${chatList.length + customChats.length}件利用可能)`
                : "📤 送信先を選択してください"
        }
        value={selectedChatId}
        onChange={(value) => setSelectedChatId(value)}
        isLoading={loadingChats}
        filtering={true}
        searchBarPlaceholder="チャット名で検索..."
        info={
          chatList.length === 0 && customChats.length === 0
            ? "ボットをグループチャットに追加するか、カスタムチャットを設定してください"
            : "ボット参加チャットとカスタムチャット"
        }
      >
        {/* 固定のデフォルトBot項目 - 起動直後から表示 */}
        <Form.Dropdown.Section title="🤖 Bot">
          <Form.Dropdown.Item key="default-bot" value="bot" title={defaultBotName} icon="🤖" />
        </Form.Dropdown.Section>

        {/* カスタムチャット（全タイプ表示） */}
        {(() => {
          console.log("🔍 [DEBUG] カスタムチャット表示: 全カスタムチャット数:", customChats.length);
          console.log(
            "🔍 [DEBUG] カスタムチャット表示: webhookタイプ以外の数:",
            customChats.filter((chat) => chat.type !== "webhook").length
          );
          console.log(
            "🔍 [DEBUG] カスタムチャット表示: フィルタリング後のカスタムチャット:",
            customChats
          );

          return (
            customChats.length > 0 && (
              <Form.Dropdown.Section title={`⭐ カスタムチャット (${customChats.length}件)`}>
                {customChats.map((chat) => (
                  <Form.Dropdown.Item
                    key={chat.id}
                    value={chat.id}
                    title={chat.name}
                    icon={chat.type === "webhook" ? "🔗" : chat.type === "group" ? "👥" : "👤"}
                  />
                ))}
              </Form.Dropdown.Section>
            )
          );
        })()}

        {/* 設定済みデフォルトBotセクションは非表示にする */}

        {/* Botチャット */}
        {(() => {
          const botChats = chatList.filter((chat) => !chat.is_default && chat.chat_type === "bot");
          return (
            botChats.length > 0 && (
              <Form.Dropdown.Section title={`🤖 Botチャット (${botChats.length}件)`}>
                {botChats.map((chat) => (
                  <Form.Dropdown.Item
                    key={chat.chat_id}
                    value={chat.chat_id}
                    title={chat.name}
                    icon="🤖"
                  />
                ))}
              </Form.Dropdown.Section>
            )
          );
        })()}

        {/* グループチャット */}
        {(() => {
          const groupChats = chatList.filter(
            (chat) => !chat.is_default && chat.chat_type === "group"
          );
          return (
            groupChats.length > 0 && (
              <Form.Dropdown.Section title={`👥 グループチャット (${groupChats.length}件)`}>
                {groupChats.map((chat) => (
                  <Form.Dropdown.Item
                    key={chat.chat_id}
                    value={chat.chat_id}
                    title={chat.name}
                    icon="👥"
                  />
                ))}
              </Form.Dropdown.Section>
            )
          );
        })()}

        {/* 個人チャット */}
        {(() => {
          const p2pChats = chatList.filter((chat) => !chat.is_default && chat.chat_type === "p2p");
          return (
            p2pChats.length > 0 && (
              <Form.Dropdown.Section title={`👤 個人チャット (${p2pChats.length}件)`}>
                {p2pChats.map((chat) => (
                  <Form.Dropdown.Item
                    key={chat.chat_id}
                    value={chat.chat_id}
                    title={chat.name}
                    icon="👤"
                  />
                ))}
              </Form.Dropdown.Section>
            )
          );
        })()}

        {/* その他のチャット */}
        {(() => {
          const otherChats = chatList.filter(
            (chat) => !chat.is_default && !["bot", "group", "p2p"].includes(chat.chat_type)
          );
          return (
            otherChats.length > 0 && (
              <Form.Dropdown.Section title={`💬 その他のチャット (${otherChats.length}件)`}>
                {otherChats.map((chat) => (
                  <Form.Dropdown.Item
                    key={chat.chat_id}
                    value={chat.chat_id}
                    title={chat.name}
                    icon="💬"
                  />
                ))}
              </Form.Dropdown.Section>
            )
          );
        })()}

        {/* 送信先が見つからない場合の案内 */}
        {chatList.length === 0 && customChats.length === 0 && !loadingChats && (
          <Form.Dropdown.Section title="❌ 送信先が見つかりません">
            <Form.Dropdown.Item value="" title="カスタムチャットを追加してください" icon="➕" />
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>

      <Form.TextArea
        id="memo"
        title={t.memoTitle}
        placeholder="メッセージを入力…"
        value={memoContent}
        onChange={setMemoContent}
        autoFocus
      />

      <Form.FilePicker
        id="filePicker"
        title="📎 ファイル添付"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        canChooseFiles={true}
        onChange={(files) => {
          console.log("FilePicker onChange called with files:", files);
          if (files && files.length > 0) {
            handleAttachFiles(files);
          }
        }}
      />

      <Form.Separator />

      {attachedFiles.length > 0 && (
        <>
          <Form.Description
            title="📎 添付ファイル"
            text={`${attachedFiles.length}個のファイル (合計: ${formatFileSize(getTotalFileSize(attachedFiles))} / ${formatFileSize(getTotalSizeLimit())})`}
          />
          {attachedFiles.map((file, index) => (
            <Form.Description
              key={file.id}
              title={`${index + 1}. ${getFileIcon(file)} ${file.name}`}
              text={`サイズ: ${formatFileSize(file.size)}${file.mimeType ? ` | タイプ: ${file.mimeType}` : ""}${file.lastModified ? ` | 更新: ${file.lastModified.toLocaleDateString()}` : ""}`}
            />
          ))}
          <Form.Separator />
        </>
      )}
    </Form>
  );
}
