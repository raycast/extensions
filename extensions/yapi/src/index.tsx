import { Action, ActionPanel, Detail, LaunchProps, getPreferenceValues, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface IProps {
  id: string;
}

interface Error {
  message: string;
}

function safe_json_parse(str: string) {
  let result = null;
  try {
    result = JSON.parse(str);
  } catch (err: unknown) {
    result = { errmsg: (err as Error).message };
  }

  return result;
}

function formatType(type: string) {
  return (
    {
      integer: `number`,
    }[type] || type
  );
}

function flatObjects(data: any) {
  const result: any = {};
  if (data?.properties) {
    const { properties } = data;
    for (const key in properties) {
      const item = properties[key];
      if (item.type === "object") {
        result[key] = {
          type: formatType(item.type),
          description: item?.description,
          object: flatObjects(item),
        };
      } else if (item.type === "array" && !item?.items.properties) {
        result[key] = {
          type: `${formatType(item?.items.type)}[]`,
          description: item?.description,
        };
      } else if (item.type === "array") {
        result[key] = {
          type: formatType(item.type),
          description: item?.description,
          object: flatObjects(item.items),
        };
      } else {
        result[key] = {
          type: formatType(item.type),
          description: item?.description,
        };
      }
    }
  }
  return result;
}

/** transform to typescript interface */
function toTypescript(data: any, options?: { key?: string; value?: string }) {
  let result = "";
  for (const key in data) {
    const item = data[key];
    const annotation = `/**
        * ${item?.description || "TODO: unknow"}
        * */`;

    if (options && options?.key?.trim() === key?.trim()) {
      result += `
      ${annotation}
      ${key}: ${options?.value};
      `;
    } else {
      if (item?.type === "object" || item?.type === "array") {
        const type = item.type;
        const arraySuffix = type === "array" ? "[]" : "";
        result += `
        ${annotation}
        ${key}: { 
          ${toTypescript(item.object, options)}
        }${arraySuffix};`;
      } else {
        result += `
        ${annotation}
        ${key}: ${item?.type || "string"};`;
      }
    }
  }
  return result;
}

interface Preferences {
  /** yapi host */
  yapiHost: string;
  /** yapi cookie */
  yapiCookie: string;
}

export default function Command(props: LaunchProps<{ arguments: IProps }>) {
  const { id } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { yapiHost, yapiCookie } = preferences;
  const { isLoading, data }: any = useFetch(`${yapiHost}/api/interface/get?id=${id}`, {
    headers: {
      "Content-Type": "application/json",
      cookie: yapiCookie,
    },
  });

  let typescriptInterfaces = ``;
  let requestFun = ``;

  if (data?.data?.res_body) {
    const { title, method, path, project_id, _id, username, req_body_other, res_body } = data.data;
    const reqBody = req_body_other ? safe_json_parse(req_body_other) : undefined;
    const resBody = res_body ? safe_json_parse(res_body) : undefined;

    const paths = path?.split("/");
    const names: string[] = paths.map((_: string) => {
      const str = _;
      // Capital case
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    let name = names[names.length - 1];
    if (names[names.length - 1]?.length < 5) {
      name = names.filter((_, i) => i > names.length - 2).join("");
    }

    let resHasList = false;
    let typescript_list = "";
    let list_key_name = "";
    const jsonResBody = flatObjects(resBody);
    const jsonResBodyData = jsonResBody?.data?.object;
    resHasList = jsonResBodyData?.records || jsonResBodyData?.list || !!jsonResBody?.data?.content;
    if (resHasList) {
      // 有列表值的情况
      const list = jsonResBodyData?.records || jsonResBodyData?.list || jsonResBodyData?.content;
      list_key_name = jsonResBodyData?.records
        ? "records"
        : jsonResBodyData?.list
        ? "list"
        : jsonResBodyData?.content
        ? "content"
        : "";
      typescript_list = `
      /**
       * ${title}
       */
        export interface I${name}Item {
          ${toTypescript(list.object)}
        }
      `;
    }

    const typescript_request = `
    /**
     * Request Params
     */
    export interface I${name}Request {
      ${toTypescript(flatObjects(reqBody))}
    }
    `;

    const typescript_response = `
    /**
     * Response Data
     */
    export interface I${name}Response {
      ${toTypescript(jsonResBody, { key: list_key_name, value: `I${name}Item[]` })}
    }
    `;

    typescriptInterfaces = `
    /**
     * document: ${yapiHost}/project/${project_id}/interface/api/${_id} 
     * ${title}, ${String(method).toLocaleUpperCase()}
     * ${path}
     * backend: ${username}
     */
    export interface I${name} {
      request: I${name}Request;
      response: I${name}Response;
    }

    ${typescript_request}

    ${typescript_response}

    ${typescript_list}
    `;

    requestFun = `
    /**
     * document: ${yapiHost}/project/${project_id}/interface/api/${_id} 
     * ${title}, ${String(method).toLocaleUpperCase()}
     * ${path}
     * backend: ${username}
     */
    request${name}(data: I${name}['request']): Promise<I${name}['response']> {
      return request('${path}', {
        method: '${String(method).toLocaleUpperCase()}',
        data,
      });
    }
    `;
  }

  if (data?.errmsg && data?.errcode !== 0) {
    showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: data.errmsg });
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={typescriptInterfaces || data?.errmsg}
      actions={
        <ActionPanel title="Copy Clipboard">
          <Action.CopyToClipboard title="Copy Typescript" content={typescriptInterfaces} />
          <Action.CopyToClipboard title="Copy Request" content={requestFun} />
        </ActionPanel>
      }
    />
  );
}
