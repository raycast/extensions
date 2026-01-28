import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { Code } from "./types";
import http from "http";
import { copyFile, getCodeDocsUrl, getCodeGroupDescription, statusCodeToColor } from "./utils";

const typeOfPerson = getPreferenceValues<ExtensionPreferences>().typeOfPerson;

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
  const isNone = typeOfPerson === "none";
  let searchBarPlaceholder = "Filter by code or description";

  if (!isNone) {
    searchBarPlaceholder += ` (you're a ${typeOfPerson} person!)`;
  }

  return (
    <List isLoading={false} searchBarPlaceholder={searchBarPlaceholder} isShowingDetail={!isNone}>
      {Object.entries(codeGroups).map(([firstDigit, codes]) => (
        <List.Section key={firstDigit} title={`${firstDigit}xx`} subtitle={getCodeGroupDescription(firstDigit)}>
          {codes.map((code) => {
            const fileName = `${code.code}.jpg`;
            const url = `https://http.${typeOfPerson}/${fileName}`;

            return (
              <List.Item
                key={code.code}
                title={code.code}
                subtitle={code.description}
                keywords={[code.description || ""]} // make subtitle searchable
                icon={{
                  source: Icon.Dot,
                  tintColor: statusCodeToColor(code.code),
                }}
                detail={!isNone ? <List.Item.Detail markdown={`![Illustration](${url})`} /> : null}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={getCodeDocsUrl(code.code)} />
                    <Action.CopyToClipboard title="Copy Code" content={code.code} />
                    {!isNone ? (
                      <Action
                        icon={Icon.Clipboard}
                        key="copyFile"
                        title="Copy Image"
                        onAction={() => {
                          copyFile(url, fileName);
                        }}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    ) : null}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
