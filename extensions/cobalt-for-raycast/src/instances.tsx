import {
  Action,
  ActionPanel,
  Cache,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { Instance } from "./utils/Types";
import { useEffect, useState, useMemo } from "react";

const cache = new Cache();
const CACHE_PREFIX = "version-instance:";
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

type CachedInstanceData = {
  timestamp: number;
  data: Instance;
};

export default function Command() {
  const {
    instanceSourceUrl = "https://raw.githubusercontent.com/MonsPropre/cobalt-for-raycast/main/assets/instances.json",
    cobaltInstanceUrl,
    cobaltInstanceUseApiKey,
  } = getPreferenceValues();

  // On met la custom à part pour simplifier le merge
  const [customInstanceData, setCustomInstanceData] = useState<Instance | null>(
    null,
  );
  const [data, setData] = useState<Instance[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingPublic, setIsLoadingPublic] = useState<boolean>(true);
  const [isLoadingCustom, setIsLoadingCustom] = useState<boolean>(false);

  const [selection, setSelection] = useState<string | null>(null);
  const [emptyId, setEmptyId] = useState<string>("empty");

  // Cache local des résultats de la vérification de version (id/url => bool)
  const [versionCache, setVersionCache] = useState<Record<string, boolean>>({});

  // État indiquant qu'un check global est en cours
  const [checkingAll, setCheckingAll] = useState<boolean>(false);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  // Chargement des instances publiques
  useEffect(() => {
    (async () => {
      setIsLoadingPublic(true);
      try {
        const response = await fetch(instanceSourceUrl, {
          signal: AbortSignal.timeout(2500),
        });
        const d = await response.json();
        setData(d);
      } catch (error) {
        setError(error as Error);
        setEmptyId("errored");
      }
      setIsLoadingPublic(false);
    })();
  }, [instanceSourceUrl]);

  // Chargement de la custom instance dès que les prefs changent
  useEffect(() => {
    const fetchCustomInstance = async () => {
      // Pas de fetch à faire si pas d'URL
      if (!cobaltInstanceUrl) {
        setCustomInstanceData(null);
        return;
      }
      setIsLoadingCustom(true);

      try {
        const customInstance: Instance = {
          id: "custom",
          name: "Custom",
          url: cobaltInstanceUrl,
          apiKey: cobaltInstanceUseApiKey ? "true" : undefined,
        };

        const fetchedData = await getInstanceData(customInstance);

        // On merge les meta retournées dans l'instance
        const merged = {
          ...customInstance,
          ...fetchedData, // fusion si besoin (ex: services)
          cobalt: fetchedData?.cobalt ?? customInstance.cobalt,
          version:
            fetchedData?.cobalt?.version ?? customInstance?.cobalt?.version,
        };

        setCustomInstanceData(merged);

        // Pour les accessoires
        setVersionCache((vc) => ({
          ...vc,
          custom: typeof fetchedData?.cobalt?.version === "string",
        }));
      } catch (e) {
        setCustomInstanceData(null);
      }

      setIsLoadingCustom(false);
    };

    fetchCustomInstance();
  }, [cobaltInstanceUrl, cobaltInstanceUseApiKey]);

  // Pour l'affichage on met la custom avant les autres
  const allInstances: Instance[] = useMemo(() => {
    return [
      customInstanceData ?? {
        id: "custom",
        name: "Custom",
        url: cobaltInstanceUrl ?? "",
        apiKey: cobaltInstanceUseApiKey ? "true" : undefined,
      },
      ...data,
    ];
  }, [customInstanceData, data, cobaltInstanceUrl, cobaltInstanceUseApiKey]);

  useEffect(() => {
    const loadCache = async () => {
      const newVersionCache: Record<string, boolean> = {};

      // Ici on itère sur data + customInstanceData séparément pour éviter la dépendance circulaire
      const instancesToCheck = [
        ...(customInstanceData ? [customInstanceData] : []),
        ...data,
      ];

      let hasDataUpdate = false;
      let newData = data;

      for (const instance of instancesToCheck) {
        const key = CACHE_PREFIX + (instance.id ?? instance.url);
        const cachedRaw = cache.get(key);

        if (cachedRaw !== undefined) {
          try {
            const cached: CachedInstanceData = JSON.parse(cachedRaw);
            const now = Date.now();
            if (now - cached.timestamp < CACHE_TTL) {
              const isValid = typeof cached.data?.cobalt?.version === "string";
              newVersionCache[instance.id ?? instance.url] = isValid;

              if (instance.id !== "custom") {
                // Pour éviter de trigger un setData trop souvent, on fait un seul setData en fin
                const idx = data.findIndex(
                  (i) => (i.id ?? i.url) === (instance.id ?? instance.url),
                );
                if (idx !== -1) {
                  // Remplace l'instance dans newData si different
                  const mergedInstance = {
                    ...instance,
                    ...cached.data,
                    cobalt: cached.data.cobalt ?? instance.cobalt,
                    version:
                      cached.data.cobalt?.version ?? instance.cobalt?.version,
                  };
                  if (
                    JSON.stringify(data[idx]) !== JSON.stringify(mergedInstance)
                  ) {
                    if (!hasDataUpdate) {
                      newData = [...data];
                      hasDataUpdate = true;
                    }
                    newData[idx] = mergedInstance;
                  }
                }
              }
            }
          } catch {
            // ignore json parse error
          }
        }
      }

      setVersionCache((vc) => ({ ...vc, ...newVersionCache }));
      if (hasDataUpdate) {
        setData(newData);
      }
    };

    loadCache();
  }, [data, customInstanceData]);

  // Fonction pour créer la clé cache pour une instance (id ou url)
  const getCacheKeyForInstance = (instance: Instance): string =>
    CACHE_PREFIX + (instance.id ?? instance.url);

  // Fonction pour fusionner les données fetchées dans l'instance correspondante dans data
  const updateInstanceWithFetchedData = (
    idOrUrl: string,
    fetchedData: Instance,
  ) => {
    setData((oldData) =>
      oldData.map((instance) => {
        if ((instance.id ?? instance.url) === idOrUrl) {
          return {
            ...instance,
            ...fetchedData,
            cobalt: fetchedData.cobalt ?? instance.cobalt,
            version: fetchedData.cobalt?.version ?? instance?.cobalt?.version,
          };
        }
        return instance;
      }),
    );
  };

  // Fonction pour obtenir les données de l'instance via cache avec expiration et fetch si nécessaire
  async function getInstanceData(instance: Instance): Promise<Instance | null> {
    if (!instance.url) {
      setError(new Error("URL absente pour l'instance"));
      return null;
    }

    const cacheKey = getCacheKeyForInstance(instance);
    const cachedRaw = cache.get(cacheKey);

    if (cachedRaw) {
      try {
        const cached: CachedInstanceData = JSON.parse(cachedRaw);
        const now = Date.now();

        if (now - cached.timestamp < CACHE_TTL) {
          return cached.data;
        }
      } catch {
        // Ignore erreur JSON & poursuivre fetch
      }
    }

    try {
      const response = await fetch(instance.url, {
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
        headers: instance.apiKey
          ? {
              Authorization: `Bearer ${instance.apiKey}`,
            }
          : undefined,
      });

      if (!response.ok) {
        setError(
          new Error(`Erreur HTTP ${response.status} pour ${instance.url}`),
        );
        return null;
      }

      const data = await response.json();

      const toCache: CachedInstanceData = {
        timestamp: Date.now(),
        data,
      };
      cache.set(cacheKey, JSON.stringify(toCache));

      return data;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }

  // Vérification si la version cobalt existe via getInstanceData, et mise à jour de data avec cobalt
  // Modification dans checkVersionInstance pour écrire dans cache à chaque fetch réussi
  const checkVersionInstance = async (instance: Instance): Promise<boolean> => {
    const fetchedData = await getInstanceData(instance);
    if (!fetchedData) return false;

    const isValid = typeof fetchedData.cobalt?.version === "string";
    const idOrUrl = instance.id ?? instance.url;

    setVersionCache((c) => ({ ...c, [idOrUrl]: isValid }));

    if (instance.id === "custom") {
      setCustomInstanceData((old) => ({
        ...(old ?? instance),
        ...fetchedData,
        cobalt: fetchedData.cobalt ?? old?.cobalt,
        version: fetchedData.cobalt?.version ?? old?.cobalt?.version,
      }));
    } else {
      updateInstanceWithFetchedData(idOrUrl, fetchedData);
    }

    // Update the cache of the full instance data after fetch
    const cacheKey = getCacheKeyForInstance(instance);
    const toCache: CachedInstanceData = {
      timestamp: Date.now(),
      data: fetchedData,
    };
    cache.set(cacheKey, JSON.stringify(toCache));

    return isValid;
  };

  // Modification dans handleCheckAllVersions : on recharge toutes les instances (publiques + custom) et on remplace cache + state
  const handleCheckAllVersions = async () => {
    setCheckingAll(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking all instances...",
    });

    const newVersionCache: Record<string, boolean> = {};

    // On récupère les données fraîches pour toutes les instances

    allInstances.map(() => {
      cache.clear();
    });

    const newPublicData: Instance[] = [];
    for (const instance of allInstances) {
      const idOrUrl = instance.id ?? instance.url;
      const isValid = await checkVersionInstance(instance);
      newVersionCache[idOrUrl] = isValid;

      if (instance.id !== "custom") {
        const cachedRaw = cache.get(getCacheKeyForInstance(instance));

        if (cachedRaw && isValid) {
          try {
            const cached: CachedInstanceData = JSON.parse(cachedRaw);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
              newPublicData.push({
                ...instance,
                ...cached.data,
                cobalt: cached.data.cobalt ?? instance.cobalt,
              });
              continue;
            }
          } catch {
            // ignore JSON error
          }
        }
        // Ajout de l'instance même si fetch/validation a échoué
        newPublicData.push(instance);
      }
    }

    // Met à jour les états avec données fraîches et cache versions
    setVersionCache(newVersionCache);
    setCheckingAll(false);

    // Met à jour uniquement la liste publique (la customInstanceData a déjà été mise à jour dans checkVersionInstance)
    setData(newPublicData);

    // Met à jour également la cache globale des instances publiques (liste)
    cache.set(
      CACHE_PREFIX + ":public-list",
      JSON.stringify({
        timestamp: Date.now(),
        data: newPublicData,
      }),
    );

    await showToast({ style: Toast.Style.Success, title: "Check complete" });
  };

  // Icônes accessoires selon succès/échec de check version dans le cache
  const getAccessoriesForInstance = (instance: Instance) => {
    const baseAccessory = {
      icon: {
        source: Icon.AppWindow,
        tintColor: instance.frontendUrl ? Color.Green : Color.Red,
      },
    };

    const idOrUrl = instance.id ?? instance.url;
    const success = versionCache[idOrUrl];
    const versionAccessory = {
      icon: {
        source: success ? Icon.Link : Icon.Warning,
        tintColor: success ? Color.Green : Color.Red,
      },
    };
    return [baseAccessory, versionAccessory];
  };

  return (
    <List
      isLoading={isLoadingPublic || isLoadingCustom || checkingAll}
      onSelectionChange={setSelection}
      isShowingDetail={
        selection !== null && selection !== "empty" && selection !== "errored"
      }
      searchBarPlaceholder="Search instances..."
      actions={
        <ActionPanel>
          <Action title="Refetch Data" onAction={handleCheckAllVersions} />
        </ActionPanel>
      }
    >
      <List.Section title="Custom Instance">
        <List.Item
          title="Custom"
          id="custom"
          accessories={getAccessoriesForInstance(allInstances[0])}
          actions={
            <ActionPanel>
              <Action title="Refetch Data" onAction={handleCheckAllVersions} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    text={"Custom"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="URL"
                    text={allInstances[0]?.url}
                  />
                  {allInstances[0]?.cobalt?.version && (
                    <List.Item.Detail.Metadata.Label
                      title="Version"
                      text={allInstances[0].cobalt.version}
                    />
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Use API Key"
                    text={allInstances[0]?.apiKey ? "Yes" : "No"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Frontend ?"
                    text={allInstances[0]?.frontendUrl ? "Yes" : "No"}
                  />
                  {allInstances[0]?.cobalt &&
                    allInstances[0]?.cobalt?.services?.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Services">
                        {allInstances[0]?.cobalt?.services?.map((service) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={service}
                            text={service}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>

      <List.Section title="Public Instances">
        {data.length === 0 && !isLoadingPublic && (
          <List.Item
            id={emptyId}
            title="No instances found"
            subtitle="Check the source URL in preferences."
            accessories={[
              {
                icon: {
                  source: Icon.Warning,
                  tintColor: Color.Red,
                },
              },
            ]}
          />
        )}
        {data.map((instance) => (
          <List.Item
            key={instance.id ?? instance.url}
            title={instance.name}
            accessories={getAccessoriesForInstance(instance)}
            actions={
              <ActionPanel>
                <Action
                  title="Refetch Data"
                  onAction={handleCheckAllVersions}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Id"
                      text={instance?.id}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Name"
                      text={instance?.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Url"
                      text={instance?.url}
                    />
                    {instance?.cobalt?.version && (
                      <List.Item.Detail.Metadata.Label
                        title="Version"
                        text={instance.cobalt.version}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Use API Key"
                      text={instance?.apiKey ? "Yes" : "No"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Frontend ?"
                      text={instance?.frontendUrl ? "Yes" : "No"}
                    />
                    {instance?.cobalt &&
                      instance?.cobalt?.services?.length > 0 && (
                        <List.Item.Detail.Metadata.TagList title="Services">
                          {instance?.cobalt?.services?.map((service) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={service}
                              text={service}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
