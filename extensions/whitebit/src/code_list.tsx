import { List, showToast, Toast } from "@raycast/api";
import { CodesRequester } from "./api/codes";
import { FetchError } from "ofetch";
import { useEffect, useState } from "react";
import { useHttpClient } from "./hooks/use-http-client";
import { CodeListItem } from "./components/codes/CodeListItem";

export default function Command() {
  const client = useHttpClient();
  const codes = new CodesRequester(client);

  const [isLoading, setIsLoading] = useState(true);

  async function fetchCodes() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching codes",
    });

    try {
      const response = await codes.list();

      toast.style = Toast.Style.Success;
      toast.title = "Codes fetched successfully";

      return response;
    } catch (e) {
      if (e instanceof FetchError) {
        toast.style = Toast.Style.Failure;
        toast.message = e.message;
        return;
      }

      throw e;
    }
  }

  const [list, setList] = useState<Array<Code>>([]);

  useEffect(function () {
    fetchCodes().then((items) => {
      if (items?.data) {
        setList(items.data);
        setIsLoading(false);
      }
    });
  }, []);

  function WrappedList() {
    const newList: Array<Code> = [];
    const allList: Array<Code> = [];

    for (const code of list) {
      code.status === "New" ? newList.push(code) : allList.push(code);
    }

    return (
      <>
        <List.Section title="New" subtitle="Codes which not applied yet">
          {newList.map((code) => (
            <CodeListItem key={code.code} code={code} />
          ))}
        </List.Section>
        <List.Section title="Aplied">
          {allList.map((code, index) => (
            <CodeListItem key={index} code={code} />
          ))}
        </List.Section>
      </>
    );
  }

  return (
    <List searchBarPlaceholder="Search your WhiteBIT code by code, amount or ticker..." isLoading={isLoading}>
      <WrappedList />
    </List>
  );
}
