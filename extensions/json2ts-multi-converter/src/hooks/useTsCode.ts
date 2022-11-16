import { useCachedState, useFetch } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Library } from "../types";
import { useJSON } from "./useJson";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const libJson2ts = require("json2ts");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { json2ts } = require("json-ts");

const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

const useTsCode = () => {
  const [json] = useJSON();
  const [code, setCode] = useState<string>();
  const [markdown, setMarkdown] = useState<string>("No JSON data found in clipboard.");
  const [lib] = useCachedState<string>("lib", Library.JSON_2_TS);
  const libURL = useMemo(() => {
    switch (lib) {
      case Library.JSON2TS_COM_API:
        return "http://json2ts.com";
      default:
        return `http://github.com/${lib}`;
    }
  }, []);
  const getMarkdown = useCallback(
    (code: string) =>
      code
        ? `
use converter [${lib}](${libURL})

---

\`\`\`typescript
${code}
\`\`\`

`
        : "",
    [lib, libURL]
  );
  const body = useMemo(() => {
    if (!json) return "";
    const urlParams = new URLSearchParams();
    urlParams.append("ns", "someModule");
    urlParams.append("code", json);
    urlParams.append("root", "root");
    return urlParams.toString();
  }, [json]);
  const fetchData = useFetch("http://json2ts.com/Home/GetTypeScriptDefinition", {
    execute: false,
    method: "POST",
    headers,
    body,
    onError(error) {
      setMarkdown(error.message);
    },
    parseResponse: async (response) => {
      return JSON.parse(await response.text());
    },
    onData: (data) => {
      if (data.includes("declare module")) {
        setCode(data);
        setMarkdown(getMarkdown(data));
      } else {
        setMarkdown("# Network error, try other converter.");
      }
    },
  });
  const loading = useMemo(() => {
    if (!json) return false;
    if (lib !== Library.JSON2TS_COM_API) return false;
    return fetchData.isLoading;
  }, [json, lib, fetchData.isLoading]);
  useEffect(() => {
    if (!json) return;
    switch (lib) {
      case Library.JSON_2_TS: {
        // eslint-disable-next-line no-case-declarations
        const converted = libJson2ts.convert(json);
        setCode(converted);
        setMarkdown(getMarkdown(converted));
        break;
      }
      case Library.JSON_TS: {
        // eslint-disable-next-line no-case-declarations
        const converted = json2ts(json);
        setCode(converted);
        setMarkdown(getMarkdown(converted));
        break;
      }
      case Library.JSON2TS_COM_API: {
        if (!json) return;
        setMarkdown("# Loading...");
        fetchData.revalidate();
      }
    }
  }, [json, lib]);
  return [{ code, markdown, loading }];
};

export default useTsCode;
