import { useEffect, useState } from "react";
import { ActionPanel, Form, Action, open, launchCommand } from "@raycast/api";

export default function Command() {
  const buildUrl = (searchTerm: string, format: string[], style: string[]) => {
    const BASE_URL = "https://fontawesome.com/search";
    let query: string[] = [];

    if (searchTerm) {
      query.push(`q=${searchTerm}`);
    }

    if (format.length > 0) {
      query.push(`f=${format.join("%2C")}`);
    }

    if (style.length > 0) {
      query.push(`s=${style.join("%2C")}`);
    }

    if (query.length > 0) {
      return `${BASE_URL}?${query.join("&")}`;
    } else {
      return BASE_URL;
    }
  };

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [format, setFormat] = useState<string[]>([]);
  const [style, setStyle] = useState<string[]>([]);

  const [url, setUrl] = useState<string>(buildUrl(searchTerm, format, style));

  useEffect(() => {
    setUrl(buildUrl(searchTerm, format, style));
  }, [searchTerm, format, style]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Search" url={url} />
        </ActionPanel>
      }
    >
      <Form.Description text="Search for Font Awesome Icons" />
      <Form.TextField
        id="searchterm"
        title="Search Term"
        placeholder="Enter a search term"
        onChange={(v) => setSearchTerm(v)}
        value={searchTerm}
      />
      <Form.TagPicker
        id="format"
        title="Format"
        placeholder="Select a special format"
        onChange={(v) => setFormat(v)}
        value={format}
        storeValue
      >
        <Form.TagPicker.Item value="classic" title="Classic" />
        <Form.TagPicker.Item value="sharp" title="Sharp" />
        <Form.TagPicker.Item value="duotone" title="Duotone" />
        <Form.TagPicker.Item value="duotone-sharp" title="Duotone Sharp" />
        <Form.TagPicker.Item value="brands" title="Brands" />
        <Form.TagPicker.Item value="free" title="Free" />
      </Form.TagPicker>
      <Form.TagPicker
        id="style"
        title="Style"
        placeholder="Select a style"
        onChange={(v) => setStyle(v)}
        value={style}
        storeValue
      >
        <Form.TagPicker.Item value="solid" title="Solid" />
        <Form.TagPicker.Item value="regular" title="Regular" />
        <Form.TagPicker.Item value="light" title="Light" />
        <Form.TagPicker.Item value="thin" title="Thin" />
      </Form.TagPicker>
    </Form>
  );
}
