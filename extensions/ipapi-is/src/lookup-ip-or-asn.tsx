import { Action, ActionPanel, Detail, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResponse, SuccessResponse } from "./types";
import { typesAndTitles } from "./constants";
import { Fragment } from "react";

export default function LookupIPorASN(props: LaunchProps<{ arguments: Arguments.LookupIpOrAsn }>) {
  const { ip } = props.arguments;
  const { isLoading, data, revalidate } = useFetch<SuccessResponse | ErrorResponse>(`https://api.ipapi.is?q=${ip}`);

  const ipIsASN = ip.toUpperCase().includes("AS");
  const markdownHeading =
    (ipIsASN ? `# ASN: ${ip}` : `# IP: ${ip || "Your IP"}`) +
    `
---
`;
  const markdown = !data ? markdownHeading : markdownHeading + ("error" in data ? `Error: ${data.error}` : "");

  type ValueType = string | number | string[] | { [key: string]: string | number };

  function getItemTypeAndTitle(key: string) {
    return (
      typesAndTitles[key as keyof typeof typesAndTitles] || {
        type: "string",
        title: key.charAt(0).toUpperCase() + key.slice(1),
      }
    );
  }

  function mapItemsToDetailMetadata(key: string, val: ValueType) {
    const item = getItemTypeAndTitle(key);
    const title = item.title;
    if (item.title === "Country")
      return (
        <Detail.Metadata.Label
          key={key}
          title="Country"
          text={val.toString()}
          icon={`https://flagsapi.com/${val.toString().toUpperCase()}/flat/64.png`}
        />
      );
    else if (item.type === "string" || item.type === "number")
      return (
        <Detail.Metadata.Label
          key={key}
          title={title}
          text={val ? val.toString() : ""}
          icon={!val ? Icon.Minus : undefined}
        />
      );
    else if (item.type === "boolean")
      return <Detail.Metadata.Label key={key} title={title} icon={val ? Icon.Check : Icon.Multiply} />;
    else if (item.type === "link")
      return (
        <Detail.Metadata.Link
          key={key}
          title={title}
          text={val.toString()}
          target={val.toString().includes("http") ? val.toString() : `https://${val}`}
        />
      );
    else if (item.type === "email")
      return <Detail.Metadata.Link key={key} title={title} text={val.toString()} target={`mailto:${val}`} />;
    else if (item.type === "array")
      return (
        <Detail.Metadata.TagList key={key} title={title}>
          {(val as string[]).map((v) => (
            <Detail.Metadata.TagList.Item key={v} text={v} />
          ))}
        </Detail.Metadata.TagList>
      );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Time Elapsed (ms)" text={data.elapsed_ms.toString()} />
            {Object.entries(data).map(([key, val]) => {
              if (key === "elapsed_ms") return;

              // 1st we fetch this field from our constants
              const item = getItemTypeAndTitle(key);
              // 2nd we change the type to object for the items that are objects
              if (["asn", "location", "company", "datacenter"].includes(key) && !Number(val)) item.type = "object";

              if (item.type === "object") {
                const title = item.title.toUpperCase();
                return (
                  <Fragment key={key}>
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title={title} text="..." />
                    {/* We do an extra check as sometimes the field is returned as null */}
                    {val !== null && Object.entries(val).map(([k, v]) => mapItemsToDetailMetadata(k, v as ValueType))}
                  </Fragment>
                );
              } else return mapItemsToDetailMetadata(key, val);
            })}
          </Detail.Metadata>
        )
      }
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(data)} />
            <Action title="Revalidate IP or ASN" icon={Icon.Redo} onAction={() => revalidate()} />
          </ActionPanel>
        )
      }
    />
  );
}
