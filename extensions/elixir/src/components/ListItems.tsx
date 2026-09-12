import type { Generic, GenericType, ModuleDoc } from "../types";
import React from "react";
import { TYPE_FIELD, TYPE_LABEL, TYPE_COLOR } from "../utils";
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { FunctionDetail } from "../screens/FunctionDetail";

/**
 * Builds the list of items for a module's functions, macros, types or callbacks, depending on the type.
 *
 * @param module The module to render the list of items for.
 * @param type The type of items to render the items for.
 * @returns An array of `List.Item` components.
 */
export const ListItems = ({
  module,
  type,
}: {
  module: ModuleDoc;
  type: GenericType;
}): Array<JSX.Element> => {
  return (module[TYPE_FIELD[type]] as Generic[]).map((func: Generic) => (
    <ListItem
      module={module}
      func={func}
      type={type}
      key={`list-item-${func.name}-${func.type}`}
    />
  ));
};

/**
 * Renders a list item for a module's function, macro, type, or callback.
 *
 * @param module The module document containing information about the Elixir module.
 * @param func The function, macro, type or callback to render.
 * @param type The type of item being rendered (function, macro, type or callback).
 * @returns A `List.Item` component displaying the item details with actions.
 */
const ListItem = ({
  module,
  func,
  type,
}: {
  module: ModuleDoc;
  func: Generic;
  type: GenericType;
}): JSX.Element => {
  return (
    <List.Item
      // We need to use the function and type to create a unique key as the same
      // module might have a function and a callback with the same name.
      // Example: `Exception.message/1` is both a function and a callback.
      key={`${func.name}-${func.type}`}
      title={`${module.name}.${func.name}`}
      subtitle={
        func.documentation ? `${func.documentation.split(".\n")[0]}.` : ""
      }
      accessories={[
        { tag: { value: TYPE_LABEL[type], color: TYPE_COLOR[type] } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show"
            icon={Icon.MagnifyingGlass}
            target={<FunctionDetail module={module.name} func={func} />}
          />
          <Action.OpenInBrowser
            url={`https://hexdocs.pm/elixir/${module.name}.html#${func.name}`}
          />
        </ActionPanel>
      }
    />
  );
};
