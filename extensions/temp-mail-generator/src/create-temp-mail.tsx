import { ActionPanel, Action, Detail, List, showToast, Toast, Clipboard, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import axios, { AxiosInstance } from "axios";

// 🌐 Cấu hình Axios
const api: AxiosInstance = axios.create({
  baseURL: "https://api.mail.tm",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

// 📨 Loại dữ liệu
type Token = { token: string };
type Message = {
  id: string;
  from: { name: string; address: string };
  subject: string;
  intro: string;
  createdAt: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  // 🔐 Tạo email tạm thời và lấy token
  const createAccount = async () => {
    try {
      const domainRes = await api.get("/domains");
      const domain = domainRes.data["hydra:member"][0].domain;
      const generatedEmail = `user_${Date.now()}@${domain}`;
      const generatedPassword = Math.random().toString(36).slice(-10);

      await api.post("/accounts", {
        address: generatedEmail,
        password: generatedPassword,
      });

      const tokenRes = await api.post("/token", {
        address: generatedEmail,
        password: generatedPassword,
      });

      setEmail(generatedEmail);
      setPassword(generatedPassword);
      setToken((tokenRes.data as Token).token);

      showToast({ style: Toast.Style.Success, title: "✅ Email tạm thời đã tạo!" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "❌ Tạo email thất bại!", message: String(error) });
    }
  };

  // 📩 Làm mới Inbox
  const refreshInbox = async () => {
    try {
      const res = await api.get("/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data["hydra:member"]);
      showToast({ style: Toast.Style.Success, title: "📬 Inbox đã được làm mới!" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "❌ Lỗi làm mới Inbox!", message: String(error) });
    }
  };

  // 📨 Xem nội dung email (HTML hiển thị dạng text)
  const viewMessage = async (id: string) => {
    try {
      const res = await api.get(`/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const htmlContent = res.data.html?.join("") || "<p>Không có nội dung HTML.</p>";

      // **Không chuyển đổi HTML sang Markdown, hiển thị HTML string trực tiếp dưới dạng Markdown**
      push(<Detail markdown={htmlContent} />);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "❌ Lỗi xem email!", message: String(error) });
    }
  };

  useEffect(() => {
    createAccount();
  }, []);

  return (
    <List
      isLoading={!email}
      searchBarPlaceholder="🔍 Tìm kiếm email trong Inbox..."
      navigationTitle="📧 Temp Mail - mail.tm"
    >
      <List.Section title="🔑 Thông tin Tài khoản">
        <List.Item
          title="📧 Email"
          subtitle={email}
          actions={
            <ActionPanel>
              <Action
                title="📋 Sao Chép Email"
                onAction={() => {
                  Clipboard.copy(email);
                  showToast({ title: "✅ Email đã sao chép!" });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="🔒 Mật khẩu"
          subtitle={password}
          actions={
            <ActionPanel>
              <Action
                title="📋 Sao Chép Mật Khẩu"
                onAction={() => {
                  Clipboard.copy(password);
                  showToast({ title: "✅ Mật khẩu đã sao chép!" });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📬 Hộp thư đến">
        <List.Item
          title="🔄 Làm mới Inbox"
          actions={
            <ActionPanel>
              <Action title="🔄 Làm Mới" onAction={refreshInbox} />
            </ActionPanel>
          }
        />
        {messages.map((msg) => (
          <List.Item
            key={msg.id}
            title={msg.subject || "(Không có tiêu đề)"}
            subtitle={`📅 ${new Date(msg.createdAt).toLocaleString()}`}
            accessories={[{ text: msg.from.address }]}
            actions={
              <ActionPanel>
                <Action title="👀 Xem Nội Dung Email" onAction={() => viewMessage(msg.id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
