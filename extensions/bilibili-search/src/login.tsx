import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { checkQRCode, generateQRCode, isLoggedIn, logout } from "./utils/auth";

export default function Command() {
  const [isLogin, setIsLogin] = useState(isLoggedIn());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("Loading QR Code...");

  useEffect(() => {
    if (isLogin) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const initQRCode = async () => {
      try {
        const { url, qrcode_key } = await generateQRCode();
        if (!isMounted) return;

        const dataUrl = await QRCode.toDataURL(url);
        setQrCodeDataUrl(dataUrl);
        setStatus("Scan the QR code with Bilibili App");

        // Start polling
        pollInterval = setInterval(async () => {
          const res = await checkQRCode(qrcode_key);
          if (res.success) {
            setIsLogin(true);
            showToast(Toast.Style.Success, "Login Successful");
            clearInterval(pollInterval);
          } else {
            // Basic status update logic, could be refined
            if (res.message.includes("未扫码"))
              setStatus("Waiting for scan...");
            else if (res.message.includes("已扫码"))
              setStatus("Scanned! Please confirm on your phone.");
            else if (res.message.includes("已过期")) {
              setStatus("QR Code expired. Refreshing...");
              clearInterval(pollInterval);
              initQRCode(); // Refresh
            }
          }
        }, 3000);
      } catch {
        setStatus("Failed to load QR Code");
        showToast(Toast.Style.Failure, "Failed to generate QR Code");
      }
    };

    initQRCode();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isLogin]);

  const handleLogout = async () => {
    await logout();
    setIsLogin(false);
    showToast(Toast.Style.Success, "Logged out");
    // Re-init QR code is handled by useEffect when isLogin becomes false
  };

  if (isLogin) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          title="You are logged in!"
          description="You can now access your History and Favorites."
          actions={
            <ActionPanel>
              <Action
                title="Logout"
                icon={Icon.Logout}
                onAction={handleLogout}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const markdown = `
## Login to Bilibili

${qrCodeDataUrl ? `![QR Code](${qrCodeDataUrl})` : ""}

### ${status}

1. Open Bilibili App on your phone.
2. Tap the scan icon in the search bar.
3. Scan the QR code above.
4. Confirm login on your phone.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh QR Code"
            icon={Icon.ArrowClockwise}
            onAction={() => setIsLogin(false)}
          />
        </ActionPanel>
      }
    />
  );
}
