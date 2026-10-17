import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getAtprotoHandle, isAtprotoDid, DidDocument } from "@atcute/identity";
import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  AtprotoWebDidDocumentResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";
import { Handle, isHandle } from "@atcute/lexicons/syntax";

const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

const dnsResolver = new NodeDnsHandleResolver();
const httpResolver = new WellKnownHandleResolver();

interface DidResult {
  type: "did";
  did: string;
  handle: string | null;
  document: DidDocument;
}

interface HandleResult {
  type: "handle";
  handle: string;
  dnsResult: { success: boolean; did?: string; error?: string };
  httpResult: { success: boolean; did?: string; error?: string };
  match: boolean | null;
}

type ResolveResult = DidResult | HandleResult;

async function resolveIdentity(query: string): Promise<ResolveResult | null> {
  if (!query) return null;

  if (isAtprotoDid(query)) {
    const doc = await didDocumentResolver.resolve(query);
    const handle = getAtprotoHandle(doc);
    return { type: "did", did: query, handle: handle ?? null, document: doc };
  } else if (isHandle(query)) {
    const [dnsSettled, httpSettled] = await Promise.allSettled([
      dnsResolver.resolve(query as Handle),
      httpResolver.resolve(query as Handle),
    ]);

    const dnsResult =
      dnsSettled.status === "fulfilled"
        ? { success: true, did: dnsSettled.value }
        : { success: false, error: dnsSettled.reason?.message ?? "Failed" };

    const httpResult =
      httpSettled.status === "fulfilled"
        ? { success: true, did: httpSettled.value }
        : { success: false, error: httpSettled.reason?.message ?? "Failed" };

    const match = dnsResult.success && httpResult.success ? dnsResult.did === httpResult.did : null;

    return { type: "handle", handle: query, dnsResult, httpResult, match };
  }

  return null;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.startsWith("@") ? searchText.slice(1) : searchText;

  const { data: result, isLoading } = usePromise(resolveIdentity, [query], {
    execute: query.length > 0,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={result?.type === "did" || result?.type === "handle"}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a DID or handle to resolve..."
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.Switch}
          title="Resolve Identity"
          description="Enter a DID (did:plc:...) or handle (user.bsky.social)"
        />
      ) : result?.type === "did" ? (
        <List.Item
          icon={Icon.Document}
          title={result.handle ? `@${result.handle}` : result.did}
          subtitle={result.handle ? result.did : undefined}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in PDSls" url={`https://pdsls.dev/at://${result.did}#identity`} />
              {result.handle && (
                <Action
                  icon={Icon.Switch}
                  title="View Handle Resolution"
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => setSearchText(result.handle!)}
                />
              )}
              <Action.CopyToClipboard
                title="Copy DID"
                content={result.did}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Copy DID Document"
                content={JSON.stringify(result.document, null, 2)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="DID" text={result.did} />
                  {result.document.alsoKnownAs && result.document.alsoKnownAs.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {result.document.alsoKnownAs.map((aka, i) => (
                        <List.Item.Detail.Metadata.Label key={i} title={i === 0 ? "Also Known As" : ""} text={aka} />
                      ))}
                    </>
                  )}
                  {result.document.service && result.document.service.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {result.document.service.map((svc, i) => (
                        <List.Item.Detail.Metadata.Label
                          key={i}
                          title={Array.isArray(svc.type) ? svc.type[0] : svc.type}
                          text={
                            typeof svc.serviceEndpoint === "string"
                              ? svc.serviceEndpoint
                              : JSON.stringify(svc.serviceEndpoint)
                          }
                        />
                      ))}
                    </>
                  )}
                  {result.document.verificationMethod && result.document.verificationMethod.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {result.document.verificationMethod.map((vm, i) => (
                        <List.Item.Detail.Metadata.Label
                          key={i}
                          title={vm.id.replace(result.did, "")}
                          text={vm.publicKeyMultibase ?? ""}
                        />
                      ))}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ) : result?.type === "handle" ? (
        <List.Item
          icon={Icon.AtSymbol}
          title={`@${result.handle}`}
          actions={
            <ActionPanel>
              {(result.dnsResult.success || result.httpResult.success) && (
                <Action.OpenInBrowser
                  title="Open in PDSls"
                  url={`https://pdsls.dev/at://${result.dnsResult.did ?? result.httpResult.did}`}
                />
              )}
              {(result.dnsResult.success || result.httpResult.success) && (
                <Action
                  icon={Icon.Switch}
                  title="View DID Document"
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => setSearchText(result.dnsResult.did ?? result.httpResult.did!)}
                />
              )}
              {result.dnsResult.success && (
                <Action.CopyToClipboard
                  title="Copy DID (DNS)"
                  content={result.dnsResult.did!}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              )}
              {result.httpResult.success && (
                <Action.CopyToClipboard
                  title="Copy DID (HTTP)"
                  content={result.httpResult.did!}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
              )}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="DNS (_atproto TXT)"
                    text={result.dnsResult.success ? result.dnsResult.did : result.dnsResult.error}
                  />
                  <List.Item.Detail.Metadata.TagList title="">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={result.dnsResult.success ? "OK" : "Failed"}
                      color={result.dnsResult.success ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="HTTP (.well-known)"
                    text={result.httpResult.success ? result.httpResult.did : result.httpResult.error}
                  />
                  <List.Item.Detail.Metadata.TagList title="">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={result.httpResult.success ? "OK" : "Failed"}
                      color={result.httpResult.success ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  {result.match !== null && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Validation"
                        text={result.match ? "DNS and HTTP match" : "DNS and HTTP mismatch!"}
                      />
                      <List.Item.Detail.Metadata.TagList title="">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={result.match ? "Valid" : "Warning"}
                          color={result.match ? Color.Green : Color.Orange}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ) : null}
    </List>
  );
}
