import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import http from "http";

type Code = {
  code: string;
  description?: string;
};

export default function Command() {
  const codeGroups = Object.entries(http.STATUS_CODES).reduce(
    (groups: { [firstDigit: string]: Code[] }, [code, description]) => {
      const group = groups[code[0]] || [];
      group.push({ code, description });
      groups[code[0]] = group;

      return groups;
    },
    {},
  );

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by code or description...">
      {Object.entries(codeGroups).map(([firstDigit, codes]) => (
        <List.Section key={firstDigit} title={`${firstDigit}xx`} subtitle={getCodeGroupDescription(firstDigit)}>
          {codes.map((code) => (
            <List.Item
              key={code.code}
              title={code.code}
              subtitle={code.description}
              keywords={[code.description || ""]} // make subtitle searchable
              icon={{
                source: Icon.Dot,
                tintColor: statusCodeToColor(code.code),
              }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getCodeDocsUrl(code.code)} />
                  <Action.CopyToClipboard content={code.code} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function statusCodeToColor(status: string): Color {
  switch (status[0]) {
    case "1":
      return Color.Blue;
    case "2":
      return Color.Green;
    case "3":
      return Color.Yellow;
    case "4":
      return Color.Orange;
    case "5":
      return Color.Red;
    default:
      return Color.Magenta;
  }
}

function getCodeGroupDescription(firstDigit: string): string {
  switch (firstDigit) {
    case "1":
      return "Informational response – the request was received, continuing process";
    case "2":
      return "Successful – the request was successfully received, understood, and accepted";
    case "3":
      return "Redirection – further action needs to be taken in order to complete the request";
    case "4":
      return "Client error – the request contains bad syntax or cannot be fulfilled";
    case "5":
      return "Server error – the server failed to fulfil an apparently valid request";
    default:
      return "";
  }
}

function getCodeDocsUrl(code: string): string {
  const codesWithoutDocs = ["102", "207", "208", "226", "305", "421", "423", "424", "509"];

  if (codesWithoutDocs.includes(code)) {
    return "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status";
  }

  return `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`;
}
