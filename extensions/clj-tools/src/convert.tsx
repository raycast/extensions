import { Action, ActionPanel, Clipboard, Detail, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import transit from "transit-js";
import { edn } from "@yellowdig/cljs-tools";

type Format = "transit" | "json" | "edn";

const convert = (data: string, from: Format, to: Format): string | null => {
  if (!data) {
    return null;
  }
  const reader = transit.reader("json", {
    mapBuilder: {
      init: () => new Object(),
      add: (m, k, v) => {
        m[k] = v;
        return m;
      },
      finalize: (m) => m,
    },
    arrayBuilder: {
      init: () => [],
      add: (a, v) => {
        a.push(v);
        return a;
      },
      finalize: (a) => a,
      fromArray: (a) => Array.from(a),
    },
    handlers: {
      set: (s) => new Set(s),
    },
  });
  const writer = transit.writer("json");

  if (from === "json" && to === "transit") {
    const json = JSON.parse(data);
    return writer.write(json);
  } else if (from === "transit" && to === "json") {
    const transit = reader.read(data);
    return JSON.stringify(transit, null, 2);
  } else if (from === "transit" && to === "edn") {
    const transit = reader.read(data);
    return edn.encode(transit, true);
  } else if (from === "edn" && to === "transit") {
    const json = edn.decode(data, false);
    return writer.write(json);
  } else if (from === "json" && to === "edn") {
    const json = JSON.parse(data);
    return edn.encode(json, true);
  } else if (from === "edn" && to === "json") {
    const json = edn.decode(data, false);
    return JSON.stringify(json, null, 2);
  }

  return null;
};

export default function Convert(props: LaunchProps<{ arguments: Arguments.Convert }>) {
  const { from, to, data } = props.arguments;
  const [inputData, setInputData] = useState(data);

  useEffect(() => {
    if (data) return;
    Clipboard.readText().then((content) => content && setInputData(content));
  }, []);

  try {
    const outputData = convert(inputData, from.toLowerCase() as Format, to.toLowerCase() as Format);

    const md = `
\`\`\`${to}
${outputData}
\`\`\``;

    return (
      <Detail
        markdown={md}
        actions={
          <ActionPanel title="Transit">
            <Action.CopyToClipboard title="Copy to Clipboard" content={outputData || ""} />
          </ActionPanel>
        }
      />
    );
  } catch (e) {
    let error = null;
    if (e instanceof Error) {
      error = e.message;
    }

    const md = `Couldn't convert from ${from} to ${to}, make sure the data is formatted correctly.
\`\`\`${from}
${inputData}
\`\`\`

*${error}*`;
    return <Detail markdown={md} />;
  }
}
