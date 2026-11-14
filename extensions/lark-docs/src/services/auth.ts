import { got } from "got";
import { GENERAL_DOMAIN, getDomain } from "../utils/config";

export enum QRCodeStatus {
  Init = 0,
  NotScanned = 1,
  Scanned = 2,
  Canceled = 3,
  Confirmed = 4,
  Outdated = 5,
}

export enum NextStep {
  Polling = "qr_login_polling",
  EnterApp = "enter_app",
}

interface QRCodeAPIWrapper<T> {
  code: number;
  message?: string;
  data: T;
}

interface QRCodeUser {
  avatar_url?: string;
}

interface InitQRCodeResponse {
  next_step: NextStep;
  step_info: {
    token: string;
  };
}

interface PollingQRCodeResponse {
  next_step: NextStep;
  step_info: {
    status: QRCodeStatus;
    user: QRCodeUser | null;
  };
}

export interface QRCodeSession {
  token: string;
  polling: () => Promise<{
    next_step: NextStep;
    status: QRCodeStatus;
    user: QRCodeUser | null;
    cookies: string[];
  }>;
}

function getLoginClient() {
  return got.extend({
    prefixUrl: getDomain("login"),
    responseType: "json",
    headers: {
      "x-api-version": "1.0.8",
      "x-app-id": "2",
      "x-device-info": "device_id=0;device_name=Raycast;device_os=Mac",
      "x-locale": "en-US",
      "x-terminal-type": "2",
    },
  });
}

export async function initQRCode(): Promise<QRCodeSession> {
  const client = getLoginClient();
  const initResponse = await client.post<QRCodeAPIWrapper<InitQRCodeResponse>>("accounts/qrlogin/init", {
    json: {
      biz_type: null,
      redirect_uri: GENERAL_DOMAIN,
    },
  });

  if (initResponse.body.code !== 0) {
    throw new Error(initResponse.body.message || "Unable to initialize QR login");
  }

  const token = initResponse.body.data.step_info.token;
  const flowKey = initResponse.headers["x-flow-key"];

  return {
    token,
    async polling() {
      const response = await client.post<QRCodeAPIWrapper<PollingQRCodeResponse>>("accounts/qrlogin/polling", {
        json: { biz_type: null },
        headers: flowKey ? { "x-flow-key": flowKey } : undefined,
      });

      if (response.body.code !== 0) {
        throw new Error(response.body.message || "QR login polling failed");
      }

      const setCookieHeader = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];

      return {
        ...response.body.data.step_info,
        next_step: response.body.data.next_step,
        cookies,
      };
    },
  };
}
