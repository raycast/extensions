import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fs from "fs-extra";
import { costflowConfigFilePath } from "./utils/preferences";
import Bookkeep from "./components/Bookkeep";
import CreateConfig from "./components/CreateConfig";

export default function Command() {
  const {
    isLoading,
    data: isCostflowConfigExists,
    revalidate,
  } = usePromise((path: string) => fs.exists(path), [costflowConfigFilePath]);

  if (isLoading) {
    return <List isLoading={isLoading} searchBarPlaceholder="Initializing" />;
  }

  if (isCostflowConfigExists) {
    return <Bookkeep />;
  }

  return <CreateConfig revalidate={revalidate} />;
}
