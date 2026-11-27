import { existsSync } from "node:fs";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { apiKey } from "./api-key";
import {
  ApiErrorView,
  ApiKeyRequired,
  CreateCodeForm,
  DETAIL_PREVIEW_POINTS,
  DynamicCodeActions,
  DynamicCodeMetadata,
  drawDynamicPreviews,
  dynamicPreviewPath,
} from "./dynamic-code-views";
import { imageMarkdown } from "./preview-files";
import { codeName, type DynamicCode, listCodes } from "./qrdx-api";

function CodeList({ apiKey: key }: { apiKey: string }) {
  const [search, setSearch] = useState("");
  // While a search loads, the list keeps showing the codes it has.
  const { data, isLoading, error, revalidate, mutate } = usePromise(
    (apiKeyValue: string, query: string) => listCodes(apiKeyValue, query),
    [key, search],
    { failureToastOptions: { title: "Could not load your QR codes" } }
  );
  const codes = data?.codes ?? [];

  // Previews are drawn after the list shows. Counting them re-renders the
  // list, so each shows when it's ready.
  const [, setDrawn] = useState(0);
  const { isLoading: isDrawing } = usePromise(
    (items: DynamicCode[]) => drawDynamicPreviews(items, () => setDrawn((n) => n + 1)),
    [codes],
    { execute: codes.length > 0 }
  );

  /** Shows an edited code in place, then loads the list again. */
  function changed(code: DynamicCode) {
    mutate(Promise.resolve(), {
      optimisticUpdate: (current) =>
        current
          ? { ...current, codes: current.codes.map((item) => (item.id === code.id ? code : item)) }
          : { codes: [code], total: 1 },
      shouldRevalidateAfter: true,
    });
  }

  const createAction = (
    <Action.Push
      icon={Icon.Plus}
      onPop={revalidate}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateCodeForm apiKey={key} />}
      title="Create Dynamic QR Code"
    />
  );

  return (
    <List
      filtering={false}
      isLoading={isLoading || isDrawing}
      isShowingDetail={codes.length > 0}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search titles, destinations, tags or short links…"
      throttle
    >
      {/* A failed reload keeps the codes it had; the hook's toast says why. */}
      {error && codes.length === 0 ? (
        <ApiErrorView error={error} onRetry={revalidate} />
      ) : codes.length === 0 && !isLoading ? (
        <List.EmptyView
          actions={<ActionPanel>{createAction}</ActionPanel>}
          description={
            search
              ? "Try other words, or create a code."
              : "Create a dynamic code here or in QRdx, and it shows up here."
          }
          icon={Icon.Link}
          title={search ? "No Codes Match" : "No Dynamic QR Codes Yet"}
        />
      ) : (
        <List.Section
          subtitle={data && data.total > codes.length ? `${codes.length} of ${data.total}` : undefined}
          title="Codes"
        >
          {codes.map((code) => {
            const previewPath = dynamicPreviewPath(code);
            const hasPreview = existsSync(previewPath);
            return (
              <List.Item
                actions={
                  <ActionPanel title={codeName(code)}>
                    <DynamicCodeActions apiKey={key} code={code} onChange={changed} showDetails />
                    <ActionPanel.Section>
                      {createAction}
                      <Action
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        title="Refresh"
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    // A new design draws a new file; a new key lays the pane out again.
                    key={previewPath}
                    markdown={hasPreview ? imageMarkdown(previewPath, DETAIL_PREVIEW_POINTS) : undefined}
                    metadata={<DynamicCodeMetadata code={code} Metadata={List.Item.Detail.Metadata} />}
                  />
                }
                icon={hasPreview ? { source: previewPath } : Icon.Link}
                key={code.id}
                keywords={[code.slug, code.destinationUrl ?? ""]}
                title={codeName(code)}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default function DynamicCodes() {
  const key = apiKey();
  return key ? <CodeList apiKey={key} /> : <ApiKeyRequired />;
}
