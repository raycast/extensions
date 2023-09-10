import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { queryUrlConfigs, UrlConfigs } from "./url_repository";
import { UrlPattern } from "./add_url";
import { queryArgValueListErrIfNotExistOrEmpty } from "./arg_value_repository";

interface Input {
  customizedInput?: string;
}

export default function Command(props: LaunchProps<{ arguments: Input }>) {
  const customizedInput = props.arguments.customizedInput || "";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [urlConfigs, setUrlConfigs] = useState<UrlConfigs>();
  const [arg2ValueListMap, setArg2ValueListMap] = useState(new Map<string, string[]>());

  useEffect(() => {
    async function f() {
      const uc = await queryUrlConfigs();
      setUrlConfigs(uc);

      const allArgsMap: Map<string, string[]> = new Map<string, string[]>();
      uc.urlConfigs.forEach((value, webName) => {
        for (const arg of value.args) {
          let webNameList = allArgsMap.get(arg);
          if (webNameList == undefined) {
            webNameList = [];
          } else {
            webNameList.push(webName);
          }
          allArgsMap.set(arg, webNameList);
        }
      });

      const allArgs: string[] = [];
      allArgsMap.forEach((list, arg) => {
        allArgs.push(arg);
      });

      const arg2ValueListMap = new Map<string, string[]>();
      const allPromises: Promise<string[] | undefined>[] = [];

      for (const arg of allArgs) {
        allPromises.push(queryArgValueListErrIfNotExistOrEmpty(arg, allArgsMap.get(arg)));
      }
      Promise.all(allPromises).then((results) => {
        for (let i = 0; i < results.length; i++) {
          const res = results[i];
          if (res != undefined) {
            arg2ValueListMap.set(allArgs[i], res);
          }
        }
      });

      setArg2ValueListMap(arg2ValueListMap);
    }

    f().then(() => setIsLoading(false));
  }, []);

  console.log("111", JSON.stringify(urlConfigs), JSON.stringify(arg2ValueListMap));
  console.log("222", urlConfigs, arg2ValueListMap);

  const items: JSX.Element[] = [];
  urlConfigs?.urlConfigs.forEach((value, webName) => {
    const builder = new UrlBuilder(value.urlPattern, value.args, arg2ValueListMap, customizedInput);
    items.push(
      <List.Item key={webName} title={webName} icon={"list-item.png"} actions={<UrlAction urlBuilder={builder} />} />
    );
  });

  return <List isLoading={isLoading}>{items}</List>;
}

function UrlAction({ urlBuilder }: { urlBuilder: UrlBuilder }) {
  if (urlBuilder.argList == undefined || urlBuilder.argList.length == 0) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser url={urlBuilder.build()} />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <Action.Push title={"Next"} target={<NextList argIndex={0} urlBuilder={urlBuilder} />}></Action.Push>
    </ActionPanel>
  );
}

function NextList({ argIndex, urlBuilder }: { argIndex: number; urlBuilder: UrlBuilder }) {
  console.log("next list", argIndex, urlBuilder.isLast(argIndex));
  if (urlBuilder.isLast(argIndex)) {
    return LastList(argIndex, urlBuilder);
  }

  const argName = urlBuilder.getArgName(argIndex);
  const items: JSX.Element[] = [];
  const argValueList = urlBuilder.getArgValueList(argIndex);
  for (const argValue of argValueList) {
    items.push(
      <List.Item
        key={argValue}
        title={argValue}
        icon={"list-item.png"}
        actions={
          <ActionPanel>
            <Action.Push
              title={"Next Arg"}
              target={<NextList argIndex={argIndex + 1} urlBuilder={urlBuilder} />}
              onPush={() => urlBuilder.setArgValue(argName, argValue)}
            />
          </ActionPanel>
        }
      />
    );
  }
  return <List searchBarPlaceholder={argName}>{items}</List>;
}

function LastList(index: number, urlBuilder: UrlBuilder) {
  const argName = urlBuilder.getArgName(index);
  let valueList = urlBuilder.getArgValueList(index);
  if (valueList == undefined) {
    valueList = [];
  }
  console.log(index, argName, valueList);
  return (
    <List searchBarPlaceholder={argName}>
      {valueList.map((value) => (
        <List.Item
          key={value}
          title={value}
          icon={"list-item.png"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={urlBuilder.setArgValue(argName, value).build()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

class UrlBuilder extends UrlPattern {
  arg2ValueListMap: Map<string, string[]>;
  customizedInput: string;

  constructor(utlPattern: string, argList: string[], arg2ValueListMap: Map<string, string[]>, customizedInput: string) {
    super(utlPattern, argList);
    this.arg2ValueListMap = arg2ValueListMap;
    this.customizedInput = customizedInput;
  }

  setArgValue(argName: string, argValue: string) {
    this.argPlaceHolder2ValueMap.set(this.buildPlaceHolder(argName), argValue);
    return this;
  }

  isLast(index: number) {
    return index >= this.argList.length - 1;
  }

  getArgName(index: number) {
    return this.argList[index];
  }

  getArgValueList(index: number) {
    const res = this.arg2ValueListMap.get(this.getArgName(index));
    if (res == undefined) {
      return [];
    }
    return res;
  }

  build() {
    let urlPatternCopy = this.urlPattern;
    this.argPlaceHolder2ValueMap.forEach((value, key) => {
      urlPatternCopy = urlPatternCopy.replaceAll(key, value);
    });
    urlPatternCopy = urlPatternCopy.replace("$$", encodeURIComponent(encodeURIComponent(this.customizedInput)));
    console.log("build:", urlPatternCopy);
    return urlPatternCopy;
  }
}
