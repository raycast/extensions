import { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  Icon,
  Color,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBoxCached, listSadaqahsCached, deleteSadaqahCached, listCollectionsCached } from "../api/cached";
import { confirmAndCollectBox, confirmAndDeleteBox } from "../hooks/useBoxActions";
import { getErrorMessage } from "../utils/error-handler";
import { formatCurrency, formatDate } from "../utils/format";
import { PAGINATION, SUCCESS_MESSAGES } from "../constants";
import { Box, BoxStats, Sadaqah, Collection } from "../types";
import AddSadaqahForm from "./AddSadaqahForm";
import EditBoxForm from "./EditBoxForm";
import CollectionDetail from "./CollectionDetail";

interface BoxDetailProps {
  boxId: string;
  onBoxDeleted: () => void;
  onSadaqahDeleted?: () => void;
}

export default function BoxDetail({ boxId, onBoxDeleted, onSadaqahDeleted }: BoxDetailProps) {
  const { push, pop } = useNavigation();
  const [box, setBox] = useState<Box | null>(null);
  const [stats, setStats] = useState<BoxStats | null>(null);
  const [sadaqahs, setSadaqahs] = useState<Sadaqah[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsTotal, setCollectionsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionsPage, setCollectionsPage] = useState(1);

  const fetchBoxData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [boxResponse, sadaqahsResponse, collectionsResponse] = await Promise.all([
        getBoxCached(boxId),
        listSadaqahsCached(boxId, currentPage, PAGINATION.ITEMS_PER_PAGE),
        listCollectionsCached(boxId, collectionsPage, PAGINATION.COLLECTIONS_PER_PAGE),
      ]);

      setBox(boxResponse.box);
      setStats(boxResponse.stats);
      setSadaqahs(sadaqahsResponse.sadaqahs);
      setTotalCount(sadaqahsResponse.total ?? sadaqahsResponse.pagination?.total ?? boxResponse.box.count ?? 0);
      setCollections(collectionsResponse.collections);
      setCollectionsTotal(
        collectionsResponse.total ??
          collectionsResponse.pagination?.total ??
          collectionsResponse.collections.length ??
          0,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      await showFailureToast(new Error(message), {
        title: "Failed to load box details",
      });
    } finally {
      setIsLoading(false);
    }
  }, [boxId, currentPage, collectionsPage]);

  useEffect(() => {
    fetchBoxData();
  }, [fetchBoxData]);

  async function handleDeleteBox() {
    if (!box) return;

    await confirmAndDeleteBox(box, {
      onBeforeStart: () => setIsLoading(true),
      onDeleted: () => {
        onBoxDeleted();
        pop();
      },
      onError: () => setIsLoading(false),
    });
  }

  async function handleCollectBox() {
    if (!box) return;

    await confirmAndCollectBox(box, {
      onBeforeStart: () => setIsLoading(true),
      onCollected: async (response) => {
        if (response.collection) {
          push(<CollectionDetail collection={response.collection} box={response.box || box} />);
        }
        await fetchBoxData();
      },
      onError: () => setIsLoading(false),
    });
  }

  async function handleDeleteSadaqah(sadaqah: Sadaqah) {
    if (!box) return;

    const confirmed = await confirmAlert({
      title: "Delete Sadaqah",
      message: `Are you sure you want to delete this sadaqah of ${formatCurrency(sadaqah.value, sadaqah.currency)}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteSadaqahCached(box.id, sadaqah.id);

        showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.SADAQAH_DELETED,
        });

        onSadaqahDeleted?.();
        await fetchBoxData();
      } catch (error) {
        await showFailureToast(new Error(getErrorMessage(error)), {
          title: "Failed to delete sadaqah",
        });
      }
    }
  }

  function handleViewCollectionDetail(collection: Collection) {
    if (!box) return;
    push(<CollectionDetail collection={collection} box={box} />);
  }

  if (!box) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title={loadError ? "Failed to load box details" : "Loading box details..."}
          description={loadError ?? undefined}
          icon={loadError ? Icon.ExclamationMark : Icon.Box}
          actions={
            loadError ? (
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchBoxData} />
              </ActionPanel>
            ) : undefined
          }
        />
      </List>
    );
  }

  const baseCurrency = box.baseCurrency;
  const totalSadaqahPages = Math.ceil(totalCount / PAGINATION.ITEMS_PER_PAGE);
  const totalCollectionPages = Math.ceil(collectionsTotal / PAGINATION.COLLECTIONS_PER_PAGE);

  return (
    <List isLoading={isLoading} navigationTitle={box.name} searchBarPlaceholder="Search sadaqahs...">
      <List.Section title="Box Statistics">
        <List.Item
          title="Total Value"
          icon={{ source: Icon.Coin, tintColor: Color.Yellow }}
          subtitle={formatCurrency(box.totalValue, baseCurrency)}
          accessories={[{ text: `${box.count} sadaqahs` }]}
        />
        <List.Item
          title="Base Currency"
          icon={Icon.Tag}
          subtitle={baseCurrency ? `${baseCurrency.name} (${baseCurrency.code})` : box.baseCurrencyId}
        />
        {stats && stats.firstSadaqahAt && (
          <List.Item
            title="First Sadaqah"
            icon={Icon.Calendar}
            subtitle={formatDate(stats.firstSadaqahAt, { includeTime: true })}
          />
        )}
        {stats && stats.lastSadaqahAt && (
          <List.Item
            title="Last Sadaqah"
            icon={Icon.Calendar}
            subtitle={formatDate(stats.lastSadaqahAt, { includeTime: true })}
          />
        )}
      </List.Section>

      {box.description && (
        <List.Section title="Description">
          <List.Item title={box.description} icon={Icon.Text} />
        </List.Section>
      )}

      <List.Section
        title={`Sadaqahs (${totalCount})`}
        subtitle={totalCount > PAGINATION.ITEMS_PER_PAGE ? `Page ${currentPage} of ${totalSadaqahPages}` : undefined}
      >
        {sadaqahs.map((sadaqah) => (
          <List.Item
            key={sadaqah.id}
            title={formatCurrency(sadaqah.value, sadaqah.currency)}
            subtitle={formatDate(sadaqah.createdAt, { includeTime: true })}
            icon={{ source: Icon.Coin, tintColor: Color.Green }}
            accessories={[{ text: sadaqah.currency?.code || sadaqah.currencyId }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Delete Sadaqah"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteSadaqah(sadaqah)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigation">
                  {currentPage > 1 && (
                    <Action
                      title="Previous Page"
                      icon={Icon.ArrowLeft}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "arrowLeft" },
                        Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
                      }}
                      onAction={() => setCurrentPage((p) => p - 1)}
                    />
                  )}
                  {currentPage < totalSadaqahPages && (
                    <Action
                      title="Next Page"
                      icon={Icon.ArrowRight}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "arrowRight" },
                        Windows: { modifiers: ["ctrl"], key: "arrowRight" },
                      }}
                      onAction={() => setCurrentPage((p) => p + 1)}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {collections.length > 0 && (
        <List.Section
          title={`Collections (${collectionsTotal})`}
          subtitle={
            collectionsTotal > PAGINATION.COLLECTIONS_PER_PAGE
              ? `Page ${collectionsPage} of ${totalCollectionPages}`
              : undefined
          }
        >
          {collections.map((collection) => (
            <List.Item
              key={collection.id}
              title={`Collected ${formatCurrency(collection.totalValue, collection.currency)}`}
              subtitle={formatDate(collection.emptiedAt, { includeTime: true })}
              icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
              accessories={[{ text: collection.currency?.code || collection.currencyId }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="View Collection Details"
                      icon={Icon.Eye}
                      onAction={() => handleViewCollectionDetail(collection)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigation">
                    {collectionsPage > 1 && (
                      <Action
                        title="Previous Collections"
                        icon={Icon.ArrowLeft}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "arrowLeft" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "arrowLeft" },
                        }}
                        onAction={() => setCollectionsPage((p) => p - 1)}
                      />
                    )}
                    {collectionsPage < totalCollectionPages && (
                      <Action
                        title="Next Collections"
                        icon={Icon.ArrowRight}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "arrowRight" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "arrowRight" },
                        }}
                        onAction={() => setCollectionsPage((p) => p + 1)}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Actions">
        <List.Item
          title="Add Sadaqah"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Add Sadaqah" onAction={() => push(<AddSadaqahForm box={box} onAdd={fetchBoxData} />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Edit Box"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action title="Edit Box" onAction={() => push(<EditBoxForm box={box} onUpdate={fetchBoxData} />)} />
            </ActionPanel>
          }
        />
        {box.count > 0 && (
          <List.Item
            title="Collect Box"
            icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
            subtitle={`Collect ${box.count} sadaqahs worth ${formatCurrency(box.totalValue, baseCurrency)}`}
            actions={
              <ActionPanel>
                <Action title="Collect Box" onAction={handleCollectBox} />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title="Delete Box"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          subtitle="Permanently delete this box and all its sadaqahs"
          actions={
            <ActionPanel>
              <Action
                title="Delete Box"
                style={Action.Style.Destructive}
                onAction={handleDeleteBox}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "delete" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "delete" },
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
