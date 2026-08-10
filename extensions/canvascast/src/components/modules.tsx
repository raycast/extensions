import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ModuleItem } from "./module-item";
import { HomePage } from "./home-page";
import { getModules } from "../utils/api";
import { modulesection, moduleitem } from "../utils/types";
import { showRecent, useModuleStore } from "../utils/store";

export const Modules = (props: { id: number; url: string }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [modules, setModules] = useState<modulesection[] | undefined>();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { refreshModuleItems, recentItems, pinnedItems } = useModuleStore();

  useEffect(() => {
    getModules(props.id)
      .then((modules) => {
        setModules(modules);
        setIsLoading(false);
      })
      .catch(() => {
        setModules(undefined);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    refreshModuleItems(props.id);
  }, [props.id]);

  const pinned = pinnedItems[props.id] || [];
  const recent = recentItems[props.id] || [];

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} enableFiltering={true}>
      {!isLoading && searchText.length === 0 && (
        <List.Section title="Pinned">
          {pinned.map((item) => (
            <ModuleItem key={item.id} id={props.id} url={props.url} item={item} pinned={true} />
          ))}
        </List.Section>
      )}
      {!isLoading && showRecent && searchText.length === 0 && (
        <List.Section title="Recent">
          {recent.map((item) => (
            <ModuleItem key={item.id} id={props.id} url={props.url} item={item} recent={true} />
          ))}
        </List.Section>
      )}
      {modules !== undefined ? (
        modules.map((module: modulesection, index: number) => (
          <List.Section key={index} title={module.name}>
            {module.items?.map((item: moduleitem) => <ModuleItem key={item.id} {...props} item={item} />)}
          </List.Section>
        ))
      ) : (
        <HomePage url={props.url} description={"Error fetching the course modules."} />
      )}
      {!isLoading && (modules?.length === 0 || modules[0].items?.length === 0) && (
        <HomePage url={props.url} description={"This course does not have any modules."} />
      )}
    </List>
  );
};
