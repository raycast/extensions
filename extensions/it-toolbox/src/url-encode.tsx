import { Icon, Form } from "@raycast/api";
import { UrlMode, buildQueryString, parseQueryString, previewTitle, urlDecode, urlEncode } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="URL or Text"
      placeholder="https://example.com/search?q=hello world&page=1"
      extraFields={({ setValue }) => (
        <Form.Dropdown
          id="mode"
          title="Encoding Mode"
          defaultValue={UrlMode.Component}
          storeValue
          onChange={(v) => setValue("mode", v)}
        >
          <Form.Dropdown.Item title="encodeURIComponent (recommended)" value={UrlMode.Component} icon={Icon.Code} />
          <Form.Dropdown.Item title="encodeURI (keeps URL structure)" value={UrlMode.Uri} icon={Icon.Link} />
        </Form.Dropdown>
      )}
      compute={(values) => {
        const input = values.input ?? "";
        if (!input) return [];
        const mode = (values.mode as UrlMode) ?? UrlMode.Component;
        const encoded = urlEncode(input, mode);
        const decoded = urlDecode(input, mode);
        const rows: ResultRow[] = [
          {
            id: "encoded",
            title: previewTitle(encoded),
            subtitle: "Encoded",
            icon: Icon.ArrowRight,
            detail: encoded,
            copyValue: encoded,
          },
          {
            id: "decoded",
            title: previewTitle(decoded),
            subtitle: "Decoded",
            icon: Icon.ArrowLeft,
            detail: decoded,
            copyValue: decoded,
          },
        ];
        const query = parseQueryString(input);
        if (query.length) {
          rows.push({
            id: "querystring",
            title: previewTitle(buildQueryString(query)),
            subtitle: `Normalized Query (${query.length} parameters)`,
            icon: Icon.Filter,
            detail: buildQueryString(query),
            copyValue: buildQueryString(query),
          });
          query.forEach((pair, index) => {
            rows.push({
              id: `param-${index}`,
              title: previewTitle(pair.value || "(empty)"),
              subtitle: `Parameter: ${pair.key}`,
              icon: Icon.Bookmark,
              copyValue: `${pair.key}=${pair.value}`,
              detail: `${pair.key} = ${pair.value}`,
            });
          });
        }
        return rows;
      }}
    />
  );
}
