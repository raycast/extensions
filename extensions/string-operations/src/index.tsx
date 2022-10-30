import { ActionPanel, List } from "@raycast/api";
import { performsOnClipboard } from "./operations/helpers";
import { decode, encode } from "./operations/base64";
import { capitalizeAllFirstLetters, kebabCase, toCamelCase, toLowerCase, toPascalCase } from "./operations/case";
import { parseUrl, percentDecode, percentEncode } from "./operations/url";
import { prettify } from "./operations/json";
import { removeNonAlphaNumeric } from "./operations/filter";
import { removeDuplicateLines, sortLines, trimLines } from "./operations/lines";
import { listify } from "./operations/literals";

function newActionableListItem(title: string, subtitle: string, func: (text: string) => string) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      actions={
        <ActionPanel title="Change the text in the clipboard">
          {
            <ActionPanel.Item
              title={title}
              onAction={async () => {
                return (await performsOnClipboard(func))();
              }}
            />
          }
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <List navigationTitle="String Operations">
      {newActionableListItem("Base64 Decode", "Decodes the string from base64", decode)}
      {newActionableListItem("Base64 Encode", "Base64 encodes the string", encode)}
      {newActionableListItem("Percent Decode", "Decodes the url encoded string", percentDecode)}
      {newActionableListItem("Percent Encode", "Url decodes the string", percentEncode)}
      {newActionableListItem("Json Prettify", "Formats Json string", prettify)}
      {newActionableListItem(
        "Remove Non-alpha numeric",
        "Removes special chars from the string",
        removeNonAlphaNumeric
      )}
      {newActionableListItem("To Camel Case", "Converts the string to camel case", toCamelCase)}
      {newActionableListItem("Capitalize First Letters", "Capitalizes all first letters", capitalizeAllFirstLetters)}
      {newActionableListItem("Kebab Case", "Converts the string to kebab case", kebabCase)}
      {newActionableListItem("To Lower Case", "Converts the string to lower case", toLowerCase)}
      {newActionableListItem("To Pascal Case", "Converts the string to Pascal Case", toPascalCase)}
      {newActionableListItem("Parse Url", "Parses the url and returns the query params", parseUrl)}
      {newActionableListItem("Listify", "Converts the string to a list literal", listify)}
      {newActionableListItem("Remove Duplicate Lines", "Removes duplicate lines", removeDuplicateLines)}
      {newActionableListItem("Sort Lines", "Sorts the lines", sortLines)}
      {newActionableListItem("Trim Lines", "Trims the lines", trimLines)}
    </List>
  );
}
