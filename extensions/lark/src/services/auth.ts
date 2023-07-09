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

export interface User {
  id: string;
  name: string;
  i18n_names: {
    en_us: string;
    ja_jp: string;
    zh_cn: string;
  };
  status: number;
  tenant: {
    id: string;
    name: string;
    icon_url: string;
    icon_key: string;
    tenant_tag: number;
    tenant_brand: string;
    encrypted_tenant_key: string;
    tenant_domain: string;
    tenant_full_domain: string;
  };
  avatar_url: string;
  avatar_key: string;
  create_time: number;
  last_login_time: number;
  login_credential_id: string;
  encrypted_role: string;
  unit: string;
  geo: string;
  exclude_login: boolean;
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
    user: null | User;
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
      polling: () => Promise<{ next_step: NextStep; status: QRCodeStatus; user: null | User; cookie?: string[] }>;
    }
> {
  try {
    const { body, headers: initHeaders } = await client.post<QRCodeAPIWrapper<InitQRCodeResponse>>(
      'accounts/qrlogin/init',
      { json: { biz_type: null, redirect_uri: GENERAL_DOMAIN } }
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
          }
        );
        return { ...body.data.step_info, next_step: body.data.next_step, cookie: headers['set-cookie'] };
      },
    };
  } catch (error) {
    let errorMessage = 'Load QR Code failed';
    if (error instanceof Error) {
      errorMessage = `${errorMessage} (${error.message})`;
    }

    showToast(Toast.Style.Failure, errorMessage);
    return false;
  }
}
