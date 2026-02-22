import { Icon, List } from "@raycast/api";
import { useState } from "react";
import {
  toCamelCase,
  toConstantCase,
  toDotCase,
  toKebabCase,
  toLowerCase,
  toPascalCase,
  toSnakeCase,
  toUpperCase,
} from "./utils/string-convert.util";
import { ConvertCaseItem } from "./components/convert-case-item.component";

function StringCaseConverter() {
  const [searchText, setSearchText] = useState("");

  const input = searchText || "";

  if (!input) {
    return (
      <List onSearchTextChange={setSearchText} throttle>
        <List.EmptyView title="Type something to convert" />
      </List>
    );
  }

  return (
    <List onSearchTextChange={setSearchText} throttle>
      <List.Section title="Convention Convert">
        <ConvertCaseItem icon={"🐪"} title={"camelCase"} convertFunction={toCamelCase} input={input} />
        <ConvertCaseItem icon={Icon.Text} title={"PascalCase"} convertFunction={toPascalCase} input={input} />
        <ConvertCaseItem icon={Icon.Link} title={"kebab-case"} convertFunction={toSnakeCase} input={input} />
        <ConvertCaseItem icon={Icon.Minus} title={"snake_case"} convertFunction={toKebabCase} input={input} />
        <ConvertCaseItem icon={Icon.Dot} title={"dot.case"} convertFunction={toDotCase} input={input} />
      </List.Section>

      <List.Section title="Upper / Lower Convert">
        <ConvertCaseItem icon={Icon.Uppercase} title={"UPPERCASE"} convertFunction={toUpperCase} input={input} />
        <ConvertCaseItem icon={Icon.Lowercase} title={"lowercase"} convertFunction={toLowerCase} input={input} />
      </List.Section>

      <List.Section title="Complex Convert">
        <ConvertCaseItem title={"CONSTANT_CASE"} convertFunction={toConstantCase} input={input} />
      </List.Section>
    </List>
  );
}

export default StringCaseConverter;
