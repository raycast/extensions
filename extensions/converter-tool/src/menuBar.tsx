import { MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon="extension-icon.png" tooltip="Development assistant">
      <MenuBarExtra.Item
        title="Date Converter"
        onAction={() => open("raycast://extensions/xiaooojun/converter-tool/date-timestamp-conversion")}
      />
      <MenuBarExtra.Item
        title="Binary Converter"
        onAction={() => open("raycast://extensions/xiaooojun/converter-tool/hexadecimal-conversion")}
      />
      <MenuBarExtra.Section title="Common websites">
        <MenuBarExtra.Item
          title="github"
          icon={{ source: "https://github.githubassets.com/favicons/favicon.svg" }}
          onAction={() => open("https://github.com/")}
        />
        <MenuBarExtra.Item
          title="code Search"
          icon={{ source: "https://sourcegraph.com/favicon.ico" }}
          onAction={() => open("https://sourcegraph.com/search")}
        />
        <MenuBarExtra.Item
          title="apple develop"
          icon={{ source: "https://developer.apple.com/favicon.ico" }}
          onAction={() => open("https://developer.apple.com/cn/")}
        />
        <MenuBarExtra.Item
          title="JSON beautify"
          icon={{ source: "https://static.json.cn/r/img/favicon/favicon.ico" }}
          onAction={() => open("https://www.json.cn/")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
