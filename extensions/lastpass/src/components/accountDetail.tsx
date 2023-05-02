import { Detail, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { UnknownError } from "./unknownError";
import { Account } from "../cli";
import { isValidUrl } from "../utils";

export const AccountDetail = (args: { getData: () => Promise<Account> }) => {
  const [data, setData] = useState<Account>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => args.getData().then(setData, setError))();
  }, []);

  return error ? (
    <UnknownError error={error} />
  ) : (
    <List.Item.Detail
      isLoading={!data}
      markdown={data?.note && data.note.split("\n").join("\n")}
      metadata={
        data && (
          <List.Item.Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data.id} />
            {isValidUrl(data.url) && <Detail.Metadata.Label title="Url" text={data.url} />}
            {data.username && <Detail.Metadata.Label title="Username" text={data.username} />}
            {data.password && <Detail.Metadata.Label title="Password" text={data.password} />}
            {data.group && <Detail.Metadata.Label title="Group" text={data.group} />}
            {data.fullname && <Detail.Metadata.Label title="Full Name" text={data.fullname} />}
            <Detail.Metadata.Label
              title="Last modified"
              text={`${data.lastModified.toLocaleTimeString()} - ${data.lastModified.toLocaleDateString()}`}
            />
            <Detail.Metadata.Label
              title="Last touched"
              text={`${data.lastTouch.toLocaleTimeString()} - ${data.lastTouch.toLocaleDateString()}`}
            />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
};
