import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConfigInfo } from "./models";
import { queryArgList } from "./arg_repository";
import { updateUrlConfig, UrlConfigValue, webNameExists } from "./url_repository";
import { UrlPattern } from "./add_url";
import Style = Toast.Style;

export default function EditUrlConfigCommand({
  oldWebName,
  urlConfigValue,
}: {
  oldWebName: string;
  urlConfigValue: UrlConfigValue;
}) {
  const [webName, setWebName] = useState<string>(oldWebName);
  const [urlPattern, setUrlPattern] = useState<string>(urlConfigValue.urlPattern);
  const [argList, setArgList] = useState<string[]>(urlConfigValue.args);

  const [webNameError, setWebNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const [allArgs, setAllArgs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function f() {
      setAllArgs(await queryArgList());
    }

    f().then(() => setIsLoading(false));
  }, []);

  function validateUrl(urlPattern: string | undefined, argList: string[]) {
    if (urlPattern == undefined || urlPattern.trim().length == 0) {
      setUrlError("The field shouldn't be empty!");
      return;
    } else {
      setUrlError(undefined);
    }

    const up = new UrlPattern(urlPattern, argList);
    const errMsg = up.validate();
    console.log(errMsg);
    if (errMsg) {
      setUrlError(errMsg);
      return;
    } else {
      setUrlError(undefined);
    }
  }

  async function validateWebName(webName: string | undefined) {
    if (webName == undefined || webName.trim().length == 0) {
      setWebNameError("The field shouldn't be empty!");
      return;
    } else {
      setWebNameError(undefined);
    }

    if (webName != oldWebName) {
      if (await webNameExists(webName)) {
        setWebNameError("This web name already exists!");
        return;
      } else {
        setWebNameError(undefined);
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: ConfigInfo) => {
              console.log("add url onSubmit", values);
              updateUrlConfig(values, oldWebName).then(() => {
                showToast(Style.Success, "Updated Success").then(() => popToRoot().finally());
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="configName"
        title="Web Name"
        placeholder="Pick a name for your webpage"
        info="like tce, tcc, argos"
        error={webNameError}
        onChange={async (newValue) => {
          setWebName(newValue);
          await validateWebName(newValue);
        }}
        value={webName}
        onBlur={async (event) => {
          await validateWebName(event.target.value?.trim());
        }}
      />
      <Form.TextArea
        id="itemValue"
        title="Url Pattern"
        placeholder="https://a.b.c?arg1=${argName1}&arg2=${argName2}"
        info="url pattern, args are put in ${argName}. example: https://a.b.c?arg1=${argName1}&arg2=${argName2}"
        error={urlError}
        onChange={(newValue) => {
          setUrlPattern(newValue);
          validateUrl(newValue, argList);
        }}
        value={urlPattern}
        onBlur={(event) => {
          validateUrl(event.target.value?.trim(), argList);
        }}
      />
      <Form.TagPicker
        id="argList"
        title="Args And Orders"
        value={argList}
        onChange={(newValue) => {
          setArgList(newValue);
          validateUrl(urlPattern, newValue);
        }}
        onBlur={(event) => {
          let temp = event.target.value;
          if (temp == undefined) {
            temp = [];
          }
          validateUrl(urlPattern, temp);
        }}
      >
        {allArgs.map((arg) => (
          <Form.TagPicker.Item key={arg} value={arg} title={arg} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
