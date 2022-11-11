import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ModuleItem } from "./module-item";
import { HomePage } from "./home-page";
import { getModules } from "../utils/api";
import { modulesection, moduleitem } from "../utils/types";
import { showRecent, getRecentModuleItems, getPinnedModuleItems } from "../utils/recent";

export const Modules = (props: { id: number; url: string }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [modules, setModules] = useState<modulesection[] | undefined>();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getItems = async () => {
      try {
        const modules = await getModules(props.id);
        for (const m of modules) {
          console.log(m);
        }
        setModules(modules);
      } catch {
        setModules(undefined);
      }
      setIsLoading(false);
    };
    getItems();
  }, []);

  const [pinnedItems, setPinnedItems] = useState<moduleitem[]>();
  const [recentItems, setRecentItems] = useState<moduleitem[]>();

  const [refresh, setRefresh] = useState<boolean>(false);
  const triggerRefresh = () => setRefresh(!refresh);

  const getStoredItems = async (): Promise<void> => {
    setPinnedItems(await getPinnedModuleItems(props.id));
    setRecentItems(await getRecentModuleItems(props.id));
  };

  useEffect(() => {
    getStoredItems();
  }, [refresh]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} enableFiltering={true}>
      {!isLoading && searchText.length === 0 && (
        <List.Section title="Pinned">
          {pinnedItems?.map((item: moduleitem, index: number) => (
            <ModuleItem key={index} {...props} item={item} refresh={triggerRefresh} pinned={true} />
          ))}
        </List.Section>
      )}
      {!isLoading && showRecent && searchText.length === 0 && (
        <List.Section title="Recent">
          {recentItems?.map((item: moduleitem, index: number) => (
            <ModuleItem key={index} {...props} item={item} refresh={triggerRefresh} recent={true} />
          ))}
        </List.Section>
      )}
      {modules !== undefined ? (
        modules.map((module: modulesection, index: number) => (
          <List.Section title={module.name} key={index}>
            {module.items?.map((item: moduleitem, index: number) => (
              <ModuleItem key={index} {...props} item={item} refresh={triggerRefresh} />
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
