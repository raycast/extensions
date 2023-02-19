import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { UnknownError } from "./unknownError";
import { Account } from "../utils/cli";

const isValidUrl = (urlLike: string | undefined) => urlLike && urlLike !== "http://sn";

const toMarkdown = (args: { username?: string; url?: string; password?: string; note?: string }): string =>
  [
    isValidUrl(args.url) && `### 🔗 **Url**\n${args.url}`,
    !!args.username && `### 💻 **Username**\n${args.username}`,
    !!args.password && `### 🗝 **Password**\n${args.password}`,
    !!args.note && `### 🗒 **Note**\n${args.note.split("\n").join("  \n")}`,
  ]
    .filter((it) => it)
    .join("\n");

export const AccountDetail = (args: { getData: () => Promise<Account> }) => {
  const [data, setData] = useState<Account>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => args.getData().then(setData, setError))();
  }, []);

  return error ? (
    <UnknownError error={error} />
  ) : (
    <Detail
      isLoading={!data}
      markdown={data ? toMarkdown(data) : ""}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data?.id} />
            <Detail.Metadata.Label title="Name" text={data.name} />
            <Detail.Metadata.Label title="Group" text={data.group} />
            <Detail.Metadata.Label title="Full Name" text={data.fullname} />
            <Detail.Metadata.Label
              title="Last modified"
              text={`${data.lastModified.toLocaleTimeString()} - ${data.lastModified.toLocaleDateString()}`}
            />
            <Detail.Metadata.Label
              title="Last touched"
              text={`${data.lastTouch.toLocaleTimeString()} - ${data.lastTouch.toLocaleDateString()}`}
            />
          </Detail.Metadata>
        )
      }
    />
  );
};
