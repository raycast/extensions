import { checkLogin, checkQRCode, gennerateQRCode } from "../apis";

import { useState, useEffect } from "react";
import { Cache, showToast, Toast } from "@raycast/api";

function makeCookie(cookie: string[]) {
  let resCookie = "";
  cookie.forEach((item: string) => {
    resCookie += `${item.split(";")[0]}; `;
  });

  return resCookie;
}

export function useLogin() {
  const cache = new Cache();
  const [qrcode, setQrcode] = useState("");
  const [isLogin, setIsLogin] = useState(checkLogin());

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

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          cache.set("expires", cookie[0].match(/Expires=(.*?);/)![1]);
          cache.set("cookie", makeCookie(cookie));
          setIsLogin(true);
          clearInterval(interval);
        }, 1000);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get QRCode failed");
      }
    })();
  }, []);

  return { qrcode, isLogin };
}
