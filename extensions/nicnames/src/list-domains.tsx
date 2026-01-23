import { useCachedPromise } from "@raycast/utils";
import { OrderDomain } from "./types";
import { callApi } from "./nicnames";
import { Color, Icon, List } from "@raycast/api";

export default function Domains() {
  const { isLoading, data: domains } = useCachedPromise(
    async () => {
      const result = await callApi<{ list: OrderDomain[] }>("domain");
      return result.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {domains.map((domainItem) => (
        <List.Item
          key={domainItem.oid}
          icon={
            domainItem.status.includes("active")
              ? { value: { source: Icon.EllipsisVertical, tintColor: Color.Green }, tooltip: "Active" }
              : { value: { source: Icon.EllipsisVertical, tintColor: Color.Red }, tooltip: "Inactive" }
          }
          title={domainItem.domain.name}
          detail={
            <List.Item.Detail
              markdown={`
| NS |
|----|
${domainItem.domain.ns.map((ns) => `| ${ns} |`).join("\n")}
    `}
            />
          }
        />
      ))}
    </List>
  );
}
