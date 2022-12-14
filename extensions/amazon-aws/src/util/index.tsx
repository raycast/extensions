import { Action, Icon, Keyboard } from "@raycast/api";

export function getActionOpenInBrowser(url: string) {
  return <Action.OpenInBrowser key={"browser"} title="Open in Browser" url={url} />;
}

export function getActionPush({
  component: Component,
  title,
  shortcut,
  ...props
}: {
  component: (props: any) => JSX.Element;
  title: string;
  shortcut?: Keyboard.Shortcut;
  [key: string]: any;
}) {
  return (
    <Action.Push
      key={"view"}
      title={title}
      icon={Icon.Eye}
      shortcut={shortcut}
      target={<Component {...props}></Component>}
    />
  );
}

export function getFilterPlaceholder(type: string, searchType?: string) {
  return `Filter ${type} by ${searchType ? searchType : "name"}`;
}

export function getExportResponse(response: any) {
  return (
    <Action.CopyToClipboard
      title="Copy Service Response"
      content={JSON.stringify(response, null, 2)}
      shortcut={{ modifiers: ["opt"], key: "e" }}
    />
  );
}
