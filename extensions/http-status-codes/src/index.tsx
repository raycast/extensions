import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { Code } from "./types";
import http from "http";
import { copyFile, getCodeDocsUrl, getCodeGroupDescription, statusCodeToColor } from "./utils";


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
