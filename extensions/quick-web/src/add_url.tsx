import { Action, ActionPanel, Form, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConfigInfo } from "./models";
import { queryArgList } from "./arg_repository";
import { addUrlConfig, webNameExists } from "./url_repository";
import Style = Toast.Style;

export default function AddUrlConfigCommand(props: LaunchProps<{ draftValues: ConfigInfo }>) {
  const { draftValues } = props;

  const [webName, setWebName] = useState<string>(draftValues?.configName || "");
  const [urlPattern, setUrlPattern] = useState<string>(draftValues?.itemValue || "");
  const [argList, setArgList] = useState<string[]>(draftValues?.argList || []);

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

    if (await webNameExists(webName)) {
      setWebNameError("This web name already exists!");
      return;
    } else {
      setWebNameError(undefined);
    }
  }

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: ConfigInfo) => {
              console.log("add url onSubmit", values);
              addUrlConfig(values).then(() => {
                showToast(Style.Success, "Success").then(() => {
                  popToRoot().finally();
                });
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

export class UrlPattern {
  urlPattern: string;
  argList: string[];
  argNumInUrlPattern: number;
  argPlaceHolder2ValueMap: Map<string, string>;

  constructor(urlPattern: string, argList: string[]) {
    this.urlPattern = urlPattern;
    this.argList = argList;
    this.argPlaceHolder2ValueMap = this.parseUrlPattern(urlPattern);
    this.argNumInUrlPattern = this.argPlaceHolder2ValueMap.size;
  }

  parseUrlPattern(urlPattern: string) {
    const res = new Map<string, string>();
    const reg = this.newRegExp();
    let match = reg.exec(urlPattern);
    while (match != null) {
      res.set(match[0], "");
      match = reg.exec(urlPattern);
    }
    return res;
  }

  validate() {
    if (this.argNumInUrlPattern != this.argList.length) {
      return this.unmatchedArgNumErrMsg(this.argNumInUrlPattern, this.argList.length);
    }

    const reg = this.newRegExp();
    let match = reg.exec(this.urlPattern);
    while (match != null) {
      if (!this.findArg(match[0])) {
        return "no arg find for place holder: " + match[0] + ", please create the arg first";
      }
      match = reg.exec(this.urlPattern);
    }
  }

  findArg(argNamePlaceHolder: string) {
    console.log(argNamePlaceHolder);
    for (const arg of this.argList) {
      const toCompare = this.buildPlaceHolder(arg);
      if (toCompare.trim() == argNamePlaceHolder.trim()) {
        return true;
      }
    }
    return false;
  }

  buildPlaceHolder(argName: string) {
    return "${" + argName + "}";
  }

  newRegExp() {
    return /\$\{.+?}/g;
  }

  unmatchedArgNumErrMsg(urlArgNum: number, chosenArgNum: number) {
    return "unmatched arg nums, url arg num: " + urlArgNum + ", chosen arg num: " + chosenArgNum;
  }
}
