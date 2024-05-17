import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import path from "path";
import { useState } from "react";
import { useAsync } from "react-use";
import { readFileSync } from "node:fs";

interface Author {
  name: string;
}

interface Collection {
  icon: string;
  name: string;
}

interface Document {
  collaboratorIds: string[];
  collectionId: string;
  createdAt: string;
  createdBy: Author;
  emoji: string;
  id: string;
  title: string;
  text: string;
  updatedAt: string;
  url: string;
}

interface Instance {
  name: string;
  url: string;
  apiKey: string;
}

interface Match {
  context: string;
  document: Document;
}

interface Preferences {
  instancesConfigurationPath: string;
}

const instancesConfigurationPath = path.resolve(getPreferenceValues<Preferences>().instancesConfigurationPath);
const instancesConfiguration = readFileSync(instancesConfigurationPath, "utf-8");
const instances: Instance[] = JSON.parse(instancesConfiguration);

const Command = () => {
  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "https://www.getoutline.com/images/logo.svg" }}
          title="Outline Instances Configuration Missing"
          description="Please configure at least one Outline instance in the configuration file."
        />
      </List>
    );
  } else if (instances.length === 1) {
    return <DocumentSearch instances={instances} />;
  } else {
    return (
      <List searchBarPlaceholder="Select an instance to search in or search everywhere">
        <List.Section subtitle={instances.length.toString()} title="Instances">
          {instances.map((instance, index) => (
            <List.Item
              actions={
                <ActionPanel>
                  <Action.Push title="Search Documents" target={<DocumentSearch instances={[instance]} />} />
                </ActionPanel>
              }
              key={index}
              title={`Search in ${instance.name}`}
            />
          ))}
        </List.Section>
        <List.Section title="All Instances">
          <List.Item
            actions={
              <ActionPanel>
                <Action.Push title="Search Documents" target={<DocumentSearch instances={instances} />} />
              </ActionPanel>
            }
            title="Search everywhere"
          />
        </List.Section>
      </List>
    );
  }
};

const DocumentSearch = ({ instances }: { instances: Instance[] }) => {
  const searchEverywhere = instances.length > 1;
  const placeholder = searchEverywhere ? "Search documents everywhere" : `Search documents in ${instances[0].name}`;

  const [matchedDocumentsPerInstance, setMatchedDocumentsPerInstance] = useState<Document[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  useAsync(async () => {
    if (instances.length === 0 || query.length === 0) return;

    setIsLoading(true);

    const queries = queryInstances(query, instances);
    const fetchedDocumentsPerInstance = await Promise.all(queries);
    const filteredDocumentsPerInstance = fetchedDocumentsPerInstance.filter((matches) => matches.length > 0);

    setMatchedDocumentsPerInstance(filteredDocumentsPerInstance);
    setIsLoading(false);

    if (fetchedDocumentsPerInstance.length === 0) {
      await showToast(Toast.Style.Failure, "Found no matching documents!");
    } else {
      await showToast(Toast.Style.Success, `Found ${filteredDocumentsPerInstance.flat().length} matching documents!`);
    }
  }, [instances, query]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={matchedDocumentsPerInstance.length >= 1}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={placeholder}
      throttle
    >
      {matchedDocumentsPerInstance.length === 0 && (
        <List.EmptyView
          icon={{ source: "https://www.getoutline.com/images/logo.svg" }}
          title="Start by typing a query to search for..."
        />
      )}
      {matchedDocumentsPerInstance.length >= 1 &&
        searchEverywhere &&
        matchedDocumentsPerInstance.map((matches, instanceIndex) => (
          <List.Section key={instanceIndex} subtitle={matches.length.toString()} title={instances[instanceIndex].name}>
            {matches.map((document, documentIndex) => (
              <Document document={document} instance={instances[instanceIndex]} key={documentIndex} />
            ))}
          </List.Section>
        ))}
      {matchedDocumentsPerInstance.length === 1 &&
        !searchEverywhere &&
        matchedDocumentsPerInstance[0]?.map((document, documentIndex) => (
          <Document document={document} instance={instances[0]} key={documentIndex} />
        ))}
    </List>
  );
};

const Document = ({ document, instance }: { document: Document; instance: Instance }) => {
  const [collection, setCollection] = useState<Collection | undefined>(undefined);

  useAsync(async () => {
    setCollection(await queryCollection(instance, document.collectionId));
  }, [document.collectionId, instance]);

  return (
    <List.Item
      accessories={[
        {
          icon: Icon.Person,
          tag: document.collaboratorIds.length.toString(),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={document.url} title="Open Document in Outline" />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={document.text}
          metadata={
            <List.Item.Detail.Metadata>
              {collection && <List.Item.Detail.Metadata.Label text={collection.name} title="Collection" />}
              <List.Item.Detail.Metadata.Label text={document.createdBy.name} title="Author" />
              <List.Item.Detail.Metadata.Label
                text={new Date(document.createdAt).toLocaleDateString()}
                title="Created At"
              />
              <List.Item.Detail.Metadata.Label
                text={new Date(document.updatedAt).toLocaleDateString()}
                title="Updated At"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      icon={document.emoji}
      key={document.id}
      title={document.title}
    />
  );
};

const queryCollection = async (instance: Instance, collectionID: string): Promise<Collection | undefined> =>
  await axios
    .post(
      `${instance.url}/api/collections.info`,
      {
        id: collectionID,
      },
      {
        headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
      },
    )
    .then((response) => {
      return response.data.data as Collection;
    })
    .catch(async (error) => {
      console.error("Failed to fetch collection from", instance.url, error);

      return undefined;
    });
const queryInstances = (query: string, instances: Instance[]) =>
  instances.map((instance) =>
    axios
      .post(
        `${instance.url}/api/documents.search`,
        {
          includeArchived: true,
          includeDrafts: true,
          query,
        },
        {
          headers: { Authorization: `Bearer ${instance.apiKey}`, "Content-Type": "application/json" },
        },
      )
      .then(
        (response) =>
          response.data.data.map((match: Match) => ({
            ...match.document,
            url: `${instance.url}/doc/${match.document.id}`,
          })) as Document[],
      )
      .catch(async (error) => {
        await showToast(Toast.Style.Failure, `Failed to fetch documents from ${instance.url}!`);

        console.error("Failed to fetch documents from", instance.url, error);

        return [];
      }),
  );

export default Command;
