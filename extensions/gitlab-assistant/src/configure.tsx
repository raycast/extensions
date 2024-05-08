import { Form, ActionPanel, Action, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState } from "react";

type Values = {
  url: string;
  token: string;
  userID: string;
};

export default function Command() {
  const handleSubmit = async (values: Values) => {
    LocalStorage.setItem("user_config", JSON.stringify({ ...values }));
    showToast({ title: "Gitlab Config", message: "保存成功", style: Toast.Style.Success });
  };

  const [urlError, setUrlError] = useState<string | undefined>();
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [idError, setIdError] = useState<string | undefined>();

  function urlValidate() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  function tokenValidate() {
    if (tokenError && tokenError.length > 0) {
      setTokenError(undefined);
    }
  }

  function idValidate() {
    if (tokenError && tokenError.length > 0) {
      setTokenError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="保存" />
        </ActionPanel>
      }
    >
      <Form.Description text="Config your gitlab basic info" />
      <Form.TextField
        storeValue
        id="url"
        title="Gitlab 地址"
        placeholder="gitlab url"
        error={urlError}
        onChange={urlValidate}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("地址必填!");
          } else {
            urlValidate();
          }
        }}
        info="eg: https://gitlab.com"
      />
      <Form.TextField
        storeValue
        id="token"
        title="Gitlab Token"
        placeholder="gitlab token"
        error={tokenError}
        onChange={tokenValidate}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTokenError("token必填!");
          } else {
            tokenValidate();
          }
        }}
        info="可在User Settings/Preferences/Access Tokens中创建"
      />
      <Form.TextField
        storeValue
        id="userID"
        title="User ID"
        placeholder="enter user id"
        error={idError}
        onChange={idValidate}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setIdError("用户ID必填!");
          } else {
            idValidate();
          }
        }}
        info="可在Profile中查看"
      />
    </Form>
  );
}
