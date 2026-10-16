import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise, withAccessToken } from "@raycast/utils";
import { useRef } from "react";
import { getAuthentication, tinyfish } from "../auth";
import { formatFetchError, formatPage, getContentText, hostname } from "../content";
import { fetchTinyFishPages, type FetchOptions, type FetchResult } from "../tinyfish";
import { library } from "../library";
import { SaveReadingAction } from "./library-actions";
import { ExportForm } from "./export-form";

function FetchedPagesView({
  options,
  saveToReadingList = false,
  onFetched,
}: {
  options: FetchOptions;
  saveToReadingList?: boolean;
  onFetched?: () => Promise<void>;
}) {
  const abortable = useRef<AbortController | null>(null);
  const { data, isLoading, error, revalidate } = usePromise(
    async (options: FetchOptions) => {
      const signal = abortable.current?.signal ?? new AbortController().signal;
      const response = await fetchTinyFishPages({ ...options, authentication: await getAuthentication(), signal });
      if (saveToReadingList && !signal.aborted) {
        try {
          await Promise.all(
            response.results.map((page) =>
              library.saveReading({
                url: page.url,
                title: page.title || page.url,
                page: { ...page, format: page.format ?? options.format ?? "markdown" },
                options,
              }),
            ),
          );
        } catch (error) {
          await showFailureToast(error, { title: "Fetched page could not be saved offline" });
        }
      }
      if (response.results.length && !signal.aborted) await onFetched?.();
      return response;
    },
    [options],
    { abortable, failureToastOptions: { title: "Could not fetch pages" } },
  );

  const retry = <Action title="Retry Fetch" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />;
  if (options.urls.length === 1) {
    const page = data?.results[0];
    if (page) return <PageDetail page={page} options={options} />;
    const failure = data?.errors[0];
    const message = error?.message ?? (failure ? formatFetchError(failure) : "No content returned.");
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Fetch Content"
        markdown={`# ${isLoading ? "Fetching page…" : "Could not fetch page"}\n\n${options.urls[0]}${isLoading ? "" : `\n\n${message}`}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={options.urls[0]} />
            {!isLoading ? retry : null}
            {failure?.error.startsWith("selector_") ? (
              <Action.Push
                title="Fetch Full Page"
                icon={Icon.Document}
                target={
                  <FetchedPages
                    options={{ ...options, include_selectors: undefined, exclude_selectors: undefined }}
                    saveToReadingList={saveToReadingList}
                    onFetched={onFetched}
                  />
                }
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Fetched Pages"
      isShowingDetail
      searchBarPlaceholder="Filter fetched pages…"
    >
      <List.EmptyView
        title={isLoading ? "Fetching pages…" : "Could not fetch pages"}
        description={error?.message}
        icon={Icon.Document}
        actions={<ActionPanel>{!isLoading ? retry : null}</ActionPanel>}
      />
      <List.Section title="Fetched" subtitle={`${data?.results.length ?? 0} of ${options.urls.length}`}>
        {data?.results.map((page) => (
          <List.Item
            key={page.url}
            title={page.title || hostname(page.url)}
            subtitle={hostname(page.url)}
            icon={Icon.Document}
            detail={<List.Item.Detail markdown={formatPage(page, options.format)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Content"
                  icon={Icon.Document}
                  target={<PageDetail page={page} options={options} />}
                />
                <Action.CopyToClipboard title="Copy Content" content={getContentText(page)} />
                <SaveReadingAction
                  url={page.url}
                  title={page.title || page.url}
                  page={{ ...page, format: page.format ?? options.format ?? "markdown" }}
                  options={options}
                />
                <Action.Push
                  title="Export Markdown"
                  icon={Icon.Download}
                  target={
                    <ExportForm title={page.title || hostname(page.url)} markdown={formatPage(page, options.format)} />
                  }
                />
                <Action.OpenInBrowser url={page.final_url ?? page.url} />
                <Action.CopyToClipboard
                  title="Copy All Content"
                  content={data.results.map((item) => formatPage(item, options.format)).join("\n\n---\n\n")}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Failed">
        {data?.errors.map((failure) => (
          <List.Item
            key={failure.url}
            title={hostname(failure.url)}
            icon={Icon.ExclamationMark}
            accessories={[{ text: failure.error }]}
            detail={
              <List.Item.Detail markdown={`# Could not fetch page\n\n${failure.url}\n\n${formatFetchError(failure)}`} />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Retry Page"
                  icon={Icon.ArrowClockwise}
                  target={
                    <FetchedPages
                      options={{ ...options, urls: [failure.url] }}
                      saveToReadingList={saveToReadingList}
                      onFetched={onFetched}
                    />
                  }
                />
                <Action.OpenInBrowser url={failure.url} />
                <Action.CopyToClipboard title="Copy URL" content={failure.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export const FetchedPages = withAccessToken(tinyfish)(FetchedPagesView);

export function PageDetail({
  page,
  options,
  savedAt,
}: {
  page: FetchResult;
  options?: FetchOptions;
  savedAt?: number;
}) {
  const format = options?.format;
  const links = page.links ?? [];
  const images = page.image_links ?? [];
  return (
    <Detail
      navigationTitle={page.title || hostname(page.url)}
      markdown={formatPage(page, format)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Source"
            text={hostname(page.final_url ?? page.url)}
            target={page.final_url ?? page.url}
          />
          {page.author ? <Detail.Metadata.Label title="Author" text={page.author} /> : null}
          {page.published_date ? <Detail.Metadata.Label title="Published" text={page.published_date} /> : null}
          {page.language ? <Detail.Metadata.Label title="Language" text={page.language} /> : null}
          <Detail.Metadata.Label title="Format" text={(page.format ?? format ?? "markdown").toUpperCase()} />
          {savedAt ? <Detail.Metadata.Label title="Offline Copy" text={new Date(savedAt).toLocaleString()} /> : null}
          {page.unmatched_selectors?.length ? (
            <Detail.Metadata.Label title="Unmatched Selectors" text={page.unmatched_selectors.join(", ")} />
          ) : null}
          {links.length ? <Detail.Metadata.Label title="Links" text={String(links.length)} /> : null}
          {images.length ? <Detail.Metadata.Label title="Images" text={String(images.length)} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={getContentText(page)} />
          <SaveReadingAction
            url={page.url}
            title={page.title || page.url}
            page={{ ...page, format: page.format ?? format ?? "markdown" }}
            options={options}
          />
          <Action.Push
            title="Export Markdown"
            icon={Icon.Download}
            target={<ExportForm title={page.title || hostname(page.url)} markdown={formatPage(page, format)} />}
          />
          <Action.OpenInBrowser url={page.final_url ?? page.url} />
          <Action.CopyToClipboard title="Copy URL" content={page.final_url ?? page.url} />
          {links.length || images.length ? (
            <Action.Push
              title="Browse Extracted Links"
              icon={Icon.Link}
              target={<PageLinks links={links} images={images} />}
            />
          ) : null}
          {links.length ? <Action.CopyToClipboard title="Copy All Page Links" content={links.join("\n")} /> : null}
          {images.length ? <Action.CopyToClipboard title="Copy All Image URLs" content={images.join("\n")} /> : null}
        </ActionPanel>
      }
    />
  );
}

function PageLinks({ links, images }: { links: string[]; images: string[] }) {
  return (
    <List navigationTitle="Extracted Links" searchBarPlaceholder="Filter links…">
      {[
        { title: "Page Links", urls: links, icon: Icon.Link },
        { title: "Images", urls: images, icon: Icon.Image },
      ].map((section) => (
        <List.Section key={section.title} title={section.title}>
          {[...new Set(section.urls)].map((url) => (
            <List.Item
              key={url}
              title={url}
              icon={section.icon}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                  <Action.CopyToClipboard title="Copy URL" content={url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
