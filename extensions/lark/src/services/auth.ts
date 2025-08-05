import { showToast, Toast } from '@raycast/api';
import got from 'got';
import { GENERAL_DOMAIN, getDomain } from '../utils/config';

export enum QRCodeStatus {
  Init = 0,
  NotScanned = 1,
  Scanned = 2,
  Canceled = 3,
  Confirmed = 4,
  Outdated = 5,
}

export enum NextStep {
  Polling = 'qr_login_polling',
  EnterApp = 'enter_app',
}

type QRCodeAPIWrapper<T> = {
  code: number;
  message: string;
  data: T;
};

export interface QRCodeUser {
  status: number;
  avatar_url: string;
  avatar_key: string;
}

export interface InitQRCodeResponse {
  next_step: NextStep;
  step_info: {
    status: QRCodeStatus.Init;
    token: string;
    user: null;
  };
}

export interface PollingQRCodeResponse {
  next_step: NextStep;
  step_info: {
    status: QRCodeStatus;
    token: string;
    user: null | QRCodeUser;
  };
}

const client = got.extend({
  prefixUrl: getDomain('login'),
  responseType: 'json',
  headers: {
    'x-api-version': '1.0.8',
    'x-app-id': '2',
    'x-device-info': 'device_id=0;device_name=Raycast;device_os=Mac',
    'x-locale': 'en-US',
    'x-terminal-type': '2',
  },
});

export async function initQRCode(): Promise<
  | false
  | {
      token: string;
      polling: () => Promise<{ next_step: NextStep; status: QRCodeStatus; user: null | QRCodeUser; cookie?: string[] }>;
    }
> {
  try {
    const { body, headers: initHeaders } = await client.post<QRCodeAPIWrapper<InitQRCodeResponse>>(
      'accounts/qrlogin/init',
      { json: { biz_type: null, redirect_uri: GENERAL_DOMAIN } },
    );

    const token = body.data.step_info.token;

    return {
      token,
      async polling() {
        const { body, headers } = await client.post<QRCodeAPIWrapper<PollingQRCodeResponse>>(
          'accounts/qrlogin/polling',
          {
            json: { biz_type: null },
            headers: { 'x-flow-key': initHeaders['x-flow-key'] },
          },
        );
        return { ...body.data.step_info, next_step: body.data.next_step, cookie: headers['set-cookie'] };
      },
    };
  } catch (error) {
    let errorMessage = 'Load QR Code failed';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }

    showToast(Toast.Style.Failure, errorMessage);
    return false;
  }
}
