import { Cache, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkQRCode, gennerateQRCode } from "./utils";

function makeCookie(cookie: string[]) {
  let resCookie = "";
  cookie.forEach((item: string) => {
    resCookie += `${item.split(";")[0]}; `;
  });

  return resCookie;
}

export default function Command() {
  const cache = new Cache();
  const [qrcode, setQrcode] = useState("");
  const [isLogin, setIsLogin] = useState(cache.has("cookie"));

  useEffect(() => {
    (async () => {
      try {
        let { qrcode, qrcode_key } = await gennerateQRCode();
        setQrcode(qrcode);

        const interval = setInterval(async () => {
          const { res, cookie } = await checkQRCode(qrcode_key);

          if (res.data.code === 86038) {
            const res = await gennerateQRCode();
            qrcode = res.qrcode;
            qrcode_key = res.qrcode_key;

            setQrcode(qrcode);
          }
          if (res.data.code !== 0 || !cookie) return;

          cache.set("cookie", JSON.stringify(makeCookie(cookie)));
          setIsLogin(true);
          clearInterval(interval);
        }, 1000);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get QRCode failed");
      }
    })();
  }, []);

  const markdown = `
## Scan the QR code below to login to Bilibili.

![qrcode_login](${qrcode})`;

  return isLogin ? (
    <List>
      <List.EmptyView
        icon={{
          source: Icon.Globe,
          tintColor: Color.Blue,
        }}
        title="You have already logged in."
      />
    </List>
  ) : (
    <Detail markdown={markdown} />
  );
}
