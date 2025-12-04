import { List } from "@raycast/api";
import useDocs from "../hooks/useDocs";
import DocsListSection from "./DocsListSection";

type DocsListProps = {
  url: string;
  packageName: string;
};

export default function DocsList({ url, packageName }: DocsListProps) {
  const { isLoading, data } = useDocs(url);
  return (
    <List
      isLoading={isLoading}
      navigationTitle={packageName}
      searchBarPlaceholder="Filter by name, module, or qualified name..."
    >
      {data?.mods && <DocsListSection key={"modules"} title={"Modules"} docs={data.mods} />}
      {data?.types && <DocsListSection key={"types"} title={"Types"} docs={data.types} />}
      {data?.constants && <DocsListSection key={"constants"} title={"Constants"} docs={data.constants} />}
      {data?.functions && <DocsListSection key={"functions"} title={"Functions"} docs={data.functions} />}
    </List>
  );
}
