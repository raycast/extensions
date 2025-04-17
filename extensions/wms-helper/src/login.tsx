import { Action, ActionPanel, Detail, Form, LocalStorage, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getEnv, getWmsDomain, setWmsToken, getWmsToken, getHeaders } from "./storage";
import { useForm, FormValidation } from "@raycast/utils";

import got from "got";

export interface LoginForm {
  account: string;
  password: string;
}

export async function getUserInfo() {
  const wmsToken = await getWmsToken();
  if (!wmsToken) {
    return false;
  }

  const wmsDomain = await getWmsDomain();
  const body = await got
    .post(`${wmsDomain}/wms/common_web/user/basic/info`, {
      headers: await getHeaders(),
    })
    .json<any>();

  return body.data;
}

export async function login({ account, password }: LoginForm) {
  const wmsDomain = await getWmsDomain();
  const res = await got.post(`${wmsDomain}/passport/web/user/login/`, {
    form: {
      account,
      password,
      mix_mode: 1,
      fp: "",
      aid: "403986",
      language: "zh",
      account_sdk_source: "web",
    },
  });

  const headers = res.headers;
  const data = JSON.parse(res.body);
  const errMsg = data.message;
  const errCode = data.error_code;

  if (errCode) {
    throw new Error(errMsg ?? "未知错误，请重试");
  }

  const env = await getEnv();
  await LocalStorage.setItem(`lastLoginAccount-${env}`, account);
  await LocalStorage.setItem(`lastLoginPassword-${env}`, password);

  setWmsToken(headers["set-cookie"]?.join(";") ?? "");
  return data.data;
}

const USER_MAP = {};

export async function autoLogin() {
  const env = await getEnv();
  const user = USER_MAP[env as keyof typeof USER_MAP];
  await login(user);
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  const loadUserInfo = async () => {
    const userInfo = await getUserInfo();
    setUserInfo(userInfo);
  };

  const { setValue, handleSubmit, itemProps } = useForm<LoginForm>({
    onSubmit: async (values) => {
      try {
        setIsFormLoading(true);
        await login(values);
        await loadUserInfo();
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `${values.account} 登陆成功`,
        });
        // 设置密码
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Yay!",
          message: err instanceof Error ? err.message : "登录失败",
        });
      } finally {
        setIsFormLoading(false);
      }
    },
    validation: {
      account: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 6) {
          return "密码必须大于6位";
        } else if (!value) {
          return "密码不能为空";
        }
      },
    },
  });

  useEffect(() => {
    (async () => {
      const env = await getEnv();
      const account = await LocalStorage.getItem(`lastLoginAccount-${env}`);
      const password = await LocalStorage.getItem(`lastLoginPassword-${env}`);
      await loadUserInfo();
      setIsLoading(false);
      if (account && password) {
        setValue("account", account as string);
        setValue("password", password as string);
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  if (userInfo) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Logout"
              onSubmit={() => {
                setUserInfo(null);
                setWmsToken("");
              }}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="用户" text={userInfo.nickname} />
            <Detail.Metadata.Label title="用户 ID" text={userInfo.userId} />
            <Detail.Metadata.Label title="部门" text={userInfo.departmentName || "--"} />
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isFormLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="用户名" {...itemProps.account} />
      <Form.PasswordField title="密码" {...itemProps.password} />
    </Form>
  );
}
