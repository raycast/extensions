import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useState } from "react";
import { isAtprotoDid } from "@atcute/identity";
import { isHandle, Handle } from "@atcute/lexicons/syntax";
import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  AtprotoWebDidDocumentResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";
import { defs, IndexedEntry, CompatibleOperationOrTombstone } from "@atcute/did-plc";
import { createOperationHistory, groupBy, DiffEntry } from "./utils/plc-logs.js";

const PLC_DIRECTORY = "https://plc.directory";

const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

const dnsResolver = new NodeDnsHandleResolver();
const httpResolver = new WellKnownHandleResolver();

interface PlcLogResult {
  did: string;
  handle: string | null;
  operations: [IndexedEntry<CompatibleOperationOrTombstone>, DiffEntry[]][];
}

async function resolveToDid(query: string): Promise<string | null> {
  if (isAtprotoDid(query)) {
    return query;
  } else if (isHandle(query)) {
    try {
      return await dnsResolver.resolve(query as Handle);
    } catch {
      try {
        return await httpResolver.resolve(query as Handle);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function fetchPlcLog(query: string): Promise<PlcLogResult | null> {
  if (!query) return null;

  const did = await resolveToDid(query);
  if (!did) return null;

  // Only PLC DIDs have operation logs
  if (!did.startsWith("did:plc:")) {
    return null;
  }

  const res = await fetch(`${PLC_DIRECTORY}/${did}/log/audit`);
  if (!res.ok) return null;

  const json = await res.json();
  const logs = defs.indexedEntryLog.parse(json);
  const opHistory = createOperationHistory(logs).reverse();
  const operations = Array.from(groupBy(opHistory, (item: DiffEntry) => item.orig)) as [
    IndexedEntry<CompatibleOperationOrTombstone>,
    DiffEntry[],
  ][];

  // Try to get handle from DID document
  let handle: string | null = null;
  try {
    const doc = await didDocumentResolver.resolve(did as `did:plc:${string}`);
    const aka = doc.alsoKnownAs?.find((a) => a.startsWith("at://"));
    if (aka) {
      handle = aka.replace("at://", "");
    }
  } catch {
    // ignore
  }

  return { did, handle, operations };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDiffIcon(diff: DiffEntry): Icon {
  switch (diff.type) {
    case "identity_created":
      return Icon.Plus;
    case "identity_tombstoned":
      return Icon.Trash;
    case "handle_added":
    case "handle_removed":
    case "handle_changed":
      return Icon.AtSymbol;
    case "rotation_key_added":
    case "rotation_key_removed":
      return Icon.Key;
    case "service_added":
    case "service_removed":
    case "service_changed":
      return Icon.HardDrive;
    case "verification_method_added":
    case "verification_method_removed":
    case "verification_method_changed":
      return Icon.Shield;
    default:
      return Icon.QuestionMark;
  }
}

function getDiffColor(diff: DiffEntry): Color {
  if (diff.orig.nullified) return Color.SecondaryText;
  if (diff.type.endsWith("_added") || diff.type === "identity_created") return Color.Green;
  if (diff.type.endsWith("_removed") || diff.type === "identity_tombstoned") return Color.Red;
  if (diff.type.endsWith("_changed")) return Color.Blue;
  return Color.PrimaryText;
}

function DiffDetail({ diff }: { diff: DiffEntry }) {
  const nullified = diff.orig.nullified;
  const icon = { source: getDiffIcon(diff), tintColor: getDiffColor(diff) };

  switch (diff.type) {
    case "identity_created":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Identity Created" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          {diff.alsoKnownAs.map((aka: string, i: number) => (
            <List.Item.Detail.Metadata.Label key={i} title={i === 0 ? "Also Known As" : ""} text={aka} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          {Object.entries(diff.services).map(([id, svc]: [string, { type: string; endpoint: string }]) => (
            <List.Item.Detail.Metadata.Label key={id} title={id} text={svc.endpoint} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          {diff.rotationKeys.map((key: string, i: number) => (
            <List.Item.Detail.Metadata.Label key={i} title={i === 0 ? "Rotation Keys" : ""} text={key} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          {Object.entries(diff.verificationMethods).map(([id, key]: [string, string]) => (
            <List.Item.Detail.Metadata.Label key={id} title={`#${id}`} text={key} />
          ))}
        </>
      );
    case "identity_tombstoned":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Identity Tombstoned" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
        </>
      );
    case "handle_added":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Alias Added" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Handle" text={diff.handle} />
        </>
      );
    case "handle_removed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Alias Removed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Handle" text={diff.handle} />
        </>
      );
    case "handle_changed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Alias Changed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="From" text={diff.prev_handle} />
          <List.Item.Detail.Metadata.Label title="To" text={diff.next_handle} />
        </>
      );
    case "rotation_key_added":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Rotation Key Added" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Key" text={diff.rotation_key} />
        </>
      );
    case "rotation_key_removed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Rotation Key Removed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Key" text={diff.rotation_key} />
        </>
      );
    case "service_added":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Service Added" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Service ID" text={diff.service_id} />
          <List.Item.Detail.Metadata.Label title="Endpoint" text={diff.service_endpoint} />
        </>
      );
    case "service_removed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Service Removed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Service ID" text={diff.service_id} />
          <List.Item.Detail.Metadata.Label title="Endpoint" text={diff.service_endpoint} />
        </>
      );
    case "service_changed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Service Changed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Service ID" text={diff.service_id} />
          <List.Item.Detail.Metadata.Label title="From" text={diff.prev_service_endpoint} />
          <List.Item.Detail.Metadata.Label title="To" text={diff.next_service_endpoint} />
        </>
      );
    case "verification_method_added":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Verification Method Added" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Method ID" text={`#${diff.method_id}`} />
          <List.Item.Detail.Metadata.Label title="Key" text={diff.method_key} />
        </>
      );
    case "verification_method_removed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Verification Method Removed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Method ID" text={`#${diff.method_id}`} />
          <List.Item.Detail.Metadata.Label title="Key" text={diff.method_key} />
        </>
      );
    case "verification_method_changed":
      return (
        <>
          <List.Item.Detail.Metadata.Label title="Type" text="Verification Method Changed" icon={icon} />
          {nullified && (
            <List.Item.Detail.Metadata.TagList title="">
              <List.Item.Detail.Metadata.TagList.Item text="Nullified" color={Color.SecondaryText} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="Method ID" text={`#${diff.method_id}`} />
          <List.Item.Detail.Metadata.Label title="From" text={diff.prev_method_key} />
          <List.Item.Detail.Metadata.Label title="To" text={diff.next_method_key} />
        </>
      );
    default:
      return <List.Item.Detail.Metadata.Label title="Type" text="Unknown" />;
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.startsWith("@") ? searchText.slice(1) : searchText;

  const { data: result, isLoading } = usePromise(fetchPlcLog, [query], {
    execute: query.length > 0,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={result !== null && result !== undefined}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a DID or handle..."
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="PLC Operation Log"
          description="Enter a DID or handle to view operation history"
        />
      ) : result ? (
        <>
          {result.operations.map(([entry, diffs]) => (
            <List.Item
              key={entry.cid}
              title={formatDate(entry.createdAt)}
              accessories={entry.nullified ? [{ tag: { value: "Nullified", color: Color.SecondaryText } }] : []}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in PDSls" url={`https://pdsls.dev/at://${result.did}#logs`} />
                  <Action.CopyToClipboard
                    title="Copy Operation"
                    content={JSON.stringify(entry, null, 2)}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Date" text={formatDate(entry.createdAt)} />
                      <List.Item.Detail.Metadata.Label title="CID" text={entry.cid} />
                      {diffs.map((diff, i) => (
                        <React.Fragment key={i}>
                          <List.Item.Detail.Metadata.Separator />
                          <DiffDetail diff={diff} />
                        </React.Fragment>
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </>
      ) : result === null ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Not Found"
          description="Could not resolve identity or fetch operation log. Only did:plc DIDs have operation logs."
        />
      ) : null}
    </List>
  );
}
