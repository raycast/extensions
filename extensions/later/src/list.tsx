import { Alert, List, LocalStorage, confirmAlert } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Links } from "./types/common";
import ReadListItem from "./components/ReadListItem";
import { update_link_handler } from "./utils/handler";
import { OrderBy } from "./common/config";
import { toInteger } from "lodash";

const list = () => {
  const [links, setLinks] = useState<Links[] | null>(null);
  const [orderBy, setOrderBy] = useState(OrderBy.time);
  const getAllLinks = useCallback(async () => {
    return (await LocalStorage.getItem("links")) ?? "[]";
  }, []);

  const handle_update = useCallback(
    async (url: string) => {
      if (!links || links.length === 0) {
        return;
      }

      const find_link = links.find((link) => link.url === url)?.read;
      if (find_link === undefined) {
        return;
      }
      setLinks(
        links.map((link) => {
          if (link.url === url) {
            link.read = !find_link;
          }
          return link;
        }),
      );

      await update_link_handler(JSON.stringify(links));
    },
    [links],
  );

  const handle_delete = useCallback(
    async (url: string) => {
      if (!links || links.length === 0) {
        return;
      }
      if (
        await confirmAlert({
          title: "Do you want to delete this link?",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const new_links = links.filter((link) => link.url !== url);
        setLinks(new_links);

        await update_link_handler(JSON.stringify(new_links));
      } else {
        return;
      }
    },
    [links],
  );

  useEffect(() => {
    getAllLinks().then((res) => {
      const pure_links = JSON.parse(res as string) as Links[];
      switch (orderBy) {
        case OrderBy.read:
          pure_links.sort((a, b) => {
            const readComparison = toInteger(a.read) - toInteger(b.read);
            if (readComparison !== 0) {
              return readComparison;
            }
            return new Date(b.add_time).getTime() - new Date(a.add_time).getTime();
          });
          break;
        case OrderBy.domain:
          pure_links.sort((a, b) => {
            const domainComparison = a.domain.localeCompare(b.domain);
            if (domainComparison !== 0) {
              return domainComparison;
            }
            return a.read === true ? 1 : -1;
          });

          break;
        default:
          pure_links.sort((a, b) => {
            const dateA = new Date(a.add_time);
            const dateB = new Date(b.add_time);
            return dateB.getTime() - dateA.getTime();
          });
      }

      setLinks(pure_links);
    });
  }, [orderBy]);

  return (
    <List
      isLoading={links === null}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort your links by"
          value={orderBy}
          onChange={(new_value) => setOrderBy(new_value as OrderBy)}
        >
          <List.Dropdown.Item title="Time" value={OrderBy.time} />
          <List.Dropdown.Item title="Read" value={OrderBy.read} />
          <List.Dropdown.Item title="Domain" value={OrderBy.domain} />
        </List.Dropdown>
      }
    >
      {!!links &&
        links.map((value) => {
          return <ReadListItem key={value.url} {...value} update={handle_update} delete={handle_delete} />;
        })}
    </List>
  );
};

export default list;
