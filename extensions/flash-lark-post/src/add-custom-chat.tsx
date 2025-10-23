import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { CustomChatManager, validateCustomChat, CustomChat } from "./custom-chats";

interface AddCustomChatProps {
  onChatAdded?: (chat: CustomChat) => void;
}

export default function AddCustomChat({ onChatAdded }: AddCustomChatProps) {
  const [name, setName] = useState("");
  const [chatId, setChatId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [type, setType] = useState<"group" | "personal" | "webhook">("group");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const chatData = {
        name: name.trim(),
        chatId: type !== "webhook" ? chatId.trim() : undefined,
        webhookUrl: type === "webhook" ? webhookUrl.trim() : undefined,
        type,
        description: description.trim() || undefined,
      };

      const errors = validateCustomChat(chatData);
      if (errors.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "入力エラー",
          message: errors[0],
        });
        return;
      }

      const newChat = await CustomChatManager.saveCustomChat(chatData);

      await showToast({
        style: Toast.Style.Success,
        title: "チャットを追加しました",
        message: `「${newChat.name}」が送信先リストに追加されました`,
      });

      onChatAdded?.(newChat);
      popToRoot();
    } catch (error) {
      console.error("Failed to save custom chat:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "チャットの保存に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="チャットを追加" icon={Icon.Plus} onAction={handleSubmit} />
          <Action
            title="キャンセル"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onAction={popToRoot}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="チャット名"
        placeholder="例: マーケティングチーム"
        value={name}
        onChange={setName}
        info="送信先リストに表示される名前です"
      />

      <Form.Dropdown
        id="type"
        title="チャットタイプ"
        value={type}
        onChange={(value) => setType(value as "group" | "personal" | "webhook")}
      >
        <Form.Dropdown.Item
          value="group"
          title="グループチャット"
          icon={{ source: Icon.TwoPeople, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          value="personal"
          title="個人チャット"
          icon={{ source: Icon.Person, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value="webhook"
          title="カスタムボット (Webhook)"
          icon={{ source: Icon.Bot, tintColor: Color.Orange }}
        />
      </Form.Dropdown>

      {type !== "webhook" ? (
        <Form.TextField
          id="chatId"
          title="チャットID"
          placeholder="例: oc_a0553eda9014c201e6969b478895c230"
          value={chatId}
          onChange={setChatId}
          info="Larkのチャット設定から取得できるチャットIDです"
        />
      ) : (
        <Form.TextField
          id="webhookUrl"
          title="Webhook URL"
          placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
          value={webhookUrl}
          onChange={setWebhookUrl}
          info="カスタムボットのWebhook URLです"
        />
      )}

      <Form.TextArea
        id="description"
        title="説明 (オプション)"
        placeholder="このチャットについての説明..."
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Description
        title="使用方法"
        text={
          type === "webhook"
            ? "カスタムボットのWebhook URLを使用して直接メッセージを送信します。\n\n1. Larkでカスタムボットを作成\n2. Webhook URLをコピー\n3. 上記のフィールドに貼り付け"
            : "チャットIDを使用してメッセージを送信します。\n\n1. Larkでチャット設定を開く\n2. チャットIDをコピー\n3. 上記のフィールドに貼り付け\n\n注意: ボットがそのチャットに参加している必要があります。"
        }
      />
    </Form>
  );
}
