import React, { useEffect, useState } from "react";
import { ModuleDoc, GenericType } from "./types";
import { List } from "@raycast/api";
import { MODULES } from "./utils";
import { ListItems } from "./components/ListItems";
import { TypeDropdown } from "./components/TypeDropdown";

/**
 * Builds the `<List.Section>` for each module, as well adding the `<List.Item>`
 * for each function in the * module's functions.
 *
 * @param module The module document containing information about the Elixir module.
 * @param types List of function types to render.
 * @returns A `List.Section` component containing `List.Item` components for the module and its functions.
 */
const ModuleSection = ({
  module,
  types,
}: {
  module: ModuleDoc;
  types: GenericType[];
}): JSX.Element => {
  return (
    <List.Section title={module.name} key={module.name}>
      {types.includes(GenericType.Function) && (
        <ListItems module={module} type={GenericType.Function} />
      )}
      {types.includes(GenericType.Macro) && (
        <ListItems module={module} type={GenericType.Macro} />
      )}
      {types.includes(GenericType.Type) && (
        <ListItems module={module} type={GenericType.Type} />
      )}
      {types.includes(GenericType.Callback) && (
        <ListItems module={module} type={GenericType.Callback} />
      )}
    </List.Section>
  );
};

export default function Command() {
  const [types, setTypes] = useState(Object.values(GenericType));
  const [modules, setModules] = useState<ModuleDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      const loadedModules = await Promise.all(MODULES);
      setModules(loadedModules);
      setIsLoading(false);
    }

    loadModules();
  }, []);

  return (
    <List
      searchBarPlaceholder="Search function"
      searchBarAccessory={<TypeDropdown onChange={setTypes} />}
      isLoading={isLoading}
    >
      {modules.map((module: ModuleDoc) => (
        <ModuleSection
          module={module}
          types={types}
          key={`module-section-${module.name}`}
        />
      ))}
    </List>
  );
}
