import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  InstallExtensionByIDAction,
  OpenExtensionByIDInBrowserAction,
  OpenExtensionByIDInCursorAction,
  UninstallExtensionByIDAction,
} from "./extension-actions";
import { useLocalExtensions } from "./extensions";
import { Extension } from "./lib/cursor";
import { compactNumberFormat } from "./utils";

function InstallExtensionAction(props: { extension: GalleryExtension; afterInstall?: () => void }): JSX.Element {
  return (
    <InstallExtensionByIDAction extensionID={getFullExtensionID(props.extension)} afterInstall={props.afterInstall} />
  );
}

function UninstallExtensionAction(props: { extension: GalleryExtension; afterUninstall?: () => void }): JSX.Element {
  return (
    <UninstallExtensionByIDAction
      extensionID={getFullExtensionID(props.extension)}
      afterUninstall={props.afterUninstall}
    />
  );
}

export interface GalleryQueryResult {
  results: Result[];
}

export interface Result {
  extensions: GalleryExtension[];
  pagingToken: any;
  resultMetadata: ResultMetadaum[];
}

export interface StatisticItem {
  statisticName: string;
  value: number;
}

export interface GalleryExtension {
  publisher: Publisher;
  extensionId: string;
  extensionName: string;
  displayName: string;
  flags: string;
  lastUpdated: string;
  publishedDate: string;
  releaseDate: string;
  shortDescription?: string;
  versions: Version[];
  deploymentType: number;
  statistics?: StatisticItem[];
}

export interface Publisher {
  publisherId: string;
  publisherName: string;
  displayName: string;
  flags: string;
  domain?: string;
  isDomainVerified: boolean;
}

export interface Version {
  version: string;
  flags: string;
  lastUpdated: string;
  files: File[];
  properties: Property[];
  assetUri: string;
  fallbackAssetUri: string;
}

export interface File {
  assetType: string;
  source: string;
}

export interface Property {
  key: string;
  value: string;
}

export interface ResultMetadaum {
  metadataType: string;
  metadataItems: MetadataItem[];
}

function getFullExtensionID(extension: GalleryExtension): string {
  return `${extension.publisher.publisherName}.${extension.extensionName}`;
}

export interface MetadataItem {
  name: string;
  count: number;
}

function GalleryExtensionListItem(props: {
  extension: GalleryExtension;
  installedExtensions: Extension[] | undefined;
  reloadLocalExtensions: () => void;
}): JSX.Element {
  const e = props.extension;
  const ie = props.installedExtensions;
  const iconURI = (): string | undefined => {
    if (!e.versions || e.versions.length <= 0) {
      return undefined;
    }
    const files = e.versions[0].files;
    const file = files.find((f) => f.assetType === "Microsoft.VisualStudio.Services.Icons.Default");
    if (file) {
      return file.source;
    }
  };
  const getInstallCount = (): number | undefined => {
    const item = e.statistics?.find((s) => s.statisticName === "install");
    return item?.value;
  };
  const installCount = getInstallCount();
  const newstVersion = e.versions && e.versions.length > 0 ? e.versions[0] : undefined;
  const version = newstVersion ? newstVersion.version : undefined;
  const lastUpdated = newstVersion ? new Date(newstVersion.lastUpdated) : undefined;
  const installedIDs = ie ? ie.map((ext) => ext.id.toLocaleLowerCase()) : [];
  const alreadyInstalled = installedIDs.includes(getFullExtensionID(e).toLocaleLowerCase());
  return (
    <List.Item
      title={{ value: e.displayName, tooltip: e.shortDescription }}
      subtitle={e.publisher?.displayName}
      icon={iconURI() || "icon.png"}
      accessories={[
        {
          tag: alreadyInstalled ? { value: "Installed", color: Color.Blue } : "",
          tooltip: alreadyInstalled ? "Already Installed" : "",
        },
        {
          icon: installCount !== undefined ? Icon.Download : undefined,
          text: installCount !== undefined ? compactNumberFormat(installCount) : undefined,
          tooltip: installCount !== undefined ? `${compactNumberFormat(installCount)} Installs` : undefined,
        },
        {
          tag: version,
          tooltip: lastUpdated ? `Last Update: ${lastUpdated?.toLocaleString()}` : "",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {alreadyInstalled ? (
              <UninstallExtensionAction extension={e} afterUninstall={props.reloadLocalExtensions} />
            ) : (
              <InstallExtensionAction extension={e} afterInstall={props.reloadLocalExtensions} />
            )}
            <OpenExtensionByIDInCursorAction extensionID={getFullExtensionID(e)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenExtensionByIDInBrowserAction extensionID={getFullExtensionID(e)} />
            <Action.CopyToClipboard
              content={getFullExtensionID(e)}
              title="Copy Extension Id"
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getTotalResultCount(data: GalleryQueryResult | undefined): number | undefined {
  if (!data || !data?.results || data.results.length <= 0) {
    return;
  }
  const result = data.results[0];
  const resultCountObject = result.resultMetadata?.find((e) => e.metadataType === "ResultCount");
  if (resultCountObject) {
    const totalCountObject = resultCountObject.metadataItems.find((e) => e.name === "TotalCount");
    if (totalCountObject) {
      return totalCountObject.count;
    }
  }
}

export default function InstallExtensionRootCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const { extensions: installExtensions, refresh } = useLocalExtensions();
  const { isLoading, error, data } = useGalleryQuery(searchText);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const extensions = data?.results ? data?.results[0].extensions : undefined;
  const totalExtensionCount = getTotalResultCount(data);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by Name or ID in VS Code Marketplace"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.Section
        title="Found Extensions"
        subtitle={
          totalExtensionCount !== undefined ? `${extensions?.length}/${totalExtensionCount}` : `${extensions?.length}`
        }
      >
        {extensions?.map((e) => (
          <GalleryExtensionListItem
            key={e.extensionId}
            extension={e}
            installedExtensions={installExtensions}
            reloadLocalExtensions={refresh}
          />
        ))}
      </List.Section>
    </List>
  );
}

enum Flags {
  None = 0x0,
  IncludeVersions = 0x1,
  IncludeFiles = 0x2,
  IncludeCategoryAndTags = 0x4,
  IncludeSharedAccounts = 0x8,
  IncludeVersionProperties = 0x10,
  ExcludeNonValidated = 0x20,
  IncludeInstallationTargets = 0x40,
  IncludeAssetUri = 0x80,
  IncludeStatistics = 0x100,
  IncludeLatestVersionOnly = 0x200,
  Unpublished = 0x1000,
}

enum FilterType {
  Tag = 1,
  ExtensionId = 4,
  Category = 5,
  ExtensionName = 7,
  Target = 8,
  Featured = 9,
  SearchText = 10,
  ExcludeWithFlags = 12,
}

function flagsToString(...flags: Flags[]): string {
  return String(flags.reduce((r, f) => r | f, 0));
}

function useGalleryQuery(searchText: string): {
  data: GalleryQueryResult | undefined;
  error: string | undefined;
  isLoading: boolean;
} {
  const url = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=3.0-preview.1";
  const headers = {
    "content-type": "application/json",
    "accept-encoding": "gzip",
  };
  const allFlags: Flags[] = [
    Flags.IncludeAssetUri,
    Flags.IncludeStatistics,
    Flags.IncludeCategoryAndTags,
    Flags.IncludeFiles,
    Flags.IncludeVersionProperties,
    Flags.ExcludeNonValidated,
  ];
  const flags = allFlags.reduce((r, f) => r | f, 0);
  const request = {
    filters: [
      {
        criteria: [
          {
            filterType: FilterType.Target,
            value: "Microsoft.VisualStudio.Code",
          },
          {
            filterType: FilterType.SearchText,
            value: searchText,
          },
          {
            filterType: FilterType.ExcludeWithFlags,
            value: flagsToString(Flags.Unpublished),
          },
        ],
        pageNumber: 1,
        pageSize: 100,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    assetTypes: [],
    flags: flags,
  };
  const body = JSON.stringify(request);
  const execute = searchText.length > 0;
  const { isLoading, error, data } = useFetch<GalleryQueryResult | undefined>(url, {
    headers: headers,
    body: body,
    method: "POST",
    keepPreviousData: false,
    execute: execute,
  });
  return {
    isLoading: execute ? isLoading : false,
    error: error?.message,
    data: searchText.length <= 0 ? undefined : data,
  };
}
