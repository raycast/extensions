import { Detail, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { UnknownError } from "./unknownError";
import { Account } from "../cli";
import { isValidUrl } from "../utils";

export const AccountDetail = (args: { showPassword: boolean; getData: () => Promise<Account> }) => {
  const [data, setData] = useState<Account>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => args.getData().then(setData, (err) => setError(err.message)))();
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
            {data.password && (
              <Detail.Metadata.Label title="Password" text={args.showPassword ? data.password : "*".repeat(12)} />
            )}
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
