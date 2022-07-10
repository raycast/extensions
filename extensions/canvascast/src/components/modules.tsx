import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ModuleItem } from "./module-item";
import { HomePage } from "./home-page";
import { getModules } from "../utils/api";
import { modulesection, moduleitem } from "../utils/types";
import { getShowRecents, getRecentModuleItems } from "../utils/recent";

export const Modules = (props: { id: number; url: string }) => {
  const [searchText, setSearchText] = useState<string>();
  const [modules, setModules] = useState<modulesection[]>();
  const [recentItems, setRecentItems] = useState<moduleitem[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const show: boolean = getShowRecents() && recentItems?.length > 0 && !searchText;

  const getRecentItems = async (): Promise<void> => {
    const items = await getRecentModuleItems(props.id);
    setRecentItems(items);
  };

  useEffect(() => {
    const getItems = async () => {
      try {
        const modules = await getModules(props.id);
        setModules(modules);
        setIsLoading(false);
      } catch {
        setModules(null);
        setIsLoading(false);
      }
    };
    getRecentItems();
    getItems();
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} enableFiltering={true}>
      {show ? (
        <List.Section title="Recent">
          {recentItems?.map((item: moduleitem, index: number) => (
            <ModuleItem key={index} {...props} item={item} show={show} getRecentItems={getRecentItems} />
          ))}
        </List.Section>
      ) : null}
      {modules !== null ? (
        modules?.map((module: modulesection, index: number) => (
          <List.Section title={module.name} key={index}>
            {module.items?.map((item: moduleitem, index: number) => (
              <ModuleItem key={index} {...props} item={item} show={show} getRecentItems={getRecentItems} />
            ))}
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
