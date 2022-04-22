import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Detail, LocalStorage, showToast, Toast } from "@raycast/api";
import { useInterval } from "./util";
import { client } from "../api";
import { AliyunDrive, isTokenInvalid } from "@chyroc/aliyundrive";

const qrcodeOpt = {
  errorCorrectionLevel: "H",
  type: "image/jpeg",
  scale: 4,
};

export default (props: { onFinish?: (success: boolean) => Promise<void> }) => {
  const [qrcode, setQrcode] = useState<AliyunDrive.GetLoginQrCodeResp>();
  const [notice, setNotice] = useState<string>("");
  const [loginState, setLoginState] = useState<0 | 1 | 2 | 3 | 4>(0); // 0 未知，1 成功，2失败，3等待扫码，4 已经扫码
  const [loading, setLoading] = useState(false);
  const [qrcodeImage, setQrcodeImage] = useState("");

  // 这个函数会在组件第一次渲染时调用，并且只会调用一次，获取预登录信息
  useEffect(() => {
    const f = async () => {
      console.log("[login] cookie:", await LocalStorage.getItem("cookie"));
      console.log("[login] token:", await LocalStorage.getItem("token"));

      setLoading(true);
      await client.init();
      console.log("[login] init");

      try {
        console.log("[login] start get drive id");
        setLoading(false);
        await client.getSelfUser();
      } catch (e) {
        console.log(`[login] get drive id fail: ${e}`);
        if (!isTokenInvalid(e)) {
          setLoading(false);
          await showToast(Toast.Style.Failure, "request fail", `${e}`);
          return;
        }

        const token = client.getToken();
        if (token.refresh_token) {
          try {
            console.log("[login] exist refresh token, start refresh token");
            await client.refreshToken();
            setLoading(false);
            console.log("[login] refresh token success");
            await client.getSelfUser();
          } catch (e) {
            setLoading(false);
            console.log(`[login] refresh token fail: ${e}`);
            await showToast(Toast.Style.Failure, "request fail", `${e}`);
            return;
          }
        } else {
          console.log("[login] no refresh token, start get qrcode and login");
          try {
            const qrcodeResp = await client.getLoginQrCode();
            console.log(`[login] get qrcode: `, qrcodeResp.data);
            setQrcode(qrcodeResp.data);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const url = await QRCode.toDataURL(qrcodeResp.data.codeContent, qrcodeOpt);
            console.log("[login] get qrcode image: ", url);
            setQrcodeImage(url!);
            setLoading(false);
            setNotice("Please Use AliyunDrive App Scan");
            console.log(`[login] get qrcode success, please scan it`);
          } catch (e) {
            console.log(`[login] get qrcode fail: ${e}`);
            setLoading(false);
            await showToast(Toast.Style.Failure, "request fail", `${e}`);
            return;
          }
        }
      }
    };
    f();
  }, []);

  // 检查登录结果
  useInterval(
    async () => {
      try {
        console.log(`[login] start query login qrcode status`);
        const resp = await client.getQrCodeStatus({ t: `${qrcode?.t}`, ck: qrcode?.ck || "" });
        if (resp.success) {
          try {
            console.log(`[login] get user again`);
          } catch (e) {
            console.log(`[login] get user again fail: ${e}`);
            await showToast(Toast.Style.Failure, "request fail", `${e}`);
            return;
          }
          setLoginState(1);
          props.onFinish && (await props.onFinish(true));
        } else if (resp.abort_msg) {
          setLoginState(2);
          setNotice(resp.abort_msg);
          props.onFinish && (await props.onFinish(false));
        } else if (resp.scaned) {
          setLoginState(4);
          setNotice("Scan Success, Please Confirm");
        } else {
          setLoginState(3);
          setNotice("Please Scan");
        }
      } catch (e) {
        // setLoginState(2)
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    },
    qrcode && qrcodeImage && !(loginState == 1 || loginState == 2) ? 1000 : null
  );

  return <Detail navigationTitle={notice} isLoading={loading} markdown={loading ? undefined : `![](${qrcodeImage})`} />;
};
