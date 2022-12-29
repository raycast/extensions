import { Color, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { useLocalExtensions } from "./extensions";
import { Extension } from "./lib/vscode";

export interface GalleryQueryResult {
  results: Result[];
}

export interface Result {
  extensions: GalleryExtension[];
  pagingToken: any;
  resultMetadata: ResultMetadaum[];
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

export interface MetadataItem {
  name: string;
  count: number;
}

function GalleryExtensionListItem(props: {
  extension: GalleryExtension;
  installedExtensions: Extension[] | undefined;
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
  const newstVersion = e.versions && e.versions.length > 0 ? e.versions[0] : undefined;
  const version = newstVersion ? newstVersion.version : undefined;
  const lastUpdated = newstVersion ? new Date(newstVersion.lastUpdated) : undefined;
  const installedIDs = ie ? ie.map((ext) => ext.id) : [];
  const alreadyInstalled = installedIDs.includes(`${e.publisher.publisherName}.${e.extensionName}`);
  return (
    <List.Item
      title={{ value: e.displayName, tooltip: e.shortDescription }}
      subtitle={e.publisher?.displayName}
      icon={iconURI() || "icon.png"}
      accessories={[
        { tag: alreadyInstalled ? { value: "Installed", color: Color.Blue } : "" },
        { tag: version, tooltip: lastUpdated ? `Last Update: ${lastUpdated?.toLocaleString()}` : "" },
      ]}
    />
  );
}

export default function InstallExtensionRootCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const { extensions: installExtensions } = useLocalExtensions();
  const { isLoading, error, data } = useGalleryQuery(searchText);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const extensions = data?.results ? data?.results[0].extensions : undefined;
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in VS Code Marketplace"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.Section title="Found Extensions" subtitle={`${extensions?.length}`}>
        {extensions?.map((e) => (
          <GalleryExtensionListItem key={e.extensionId} extension={e} installedExtensions={installExtensions} />
        ))}
      </List.Section>
    </List>
  );
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
  const request = {
    filters: [
      {
        criteria: [
          {
            filterType: 8,
            value: "Microsoft.VisualStudio.Code",
          },
          {
            filterType: 10,
            value: searchText,
          },
        ],
        pageNumber: 1,
        pageSize: 100,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    assetTypes: [],
    flags: 0,
  };
  const body = JSON.stringify(request);
  const execute = searchText.length > 0;
  const { isLoading, error, data } = useFetch<GalleryQueryResult | undefined>(url, {
    headers: headers,
    body: body,
    method: "POST",
    keepPreviousData: true,
    execute: execute,
  });
  return { isLoading: execute ? isLoading : false, error: error?.message, data };
}
