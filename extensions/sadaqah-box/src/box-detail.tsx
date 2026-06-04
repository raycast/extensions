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
} from "@raycast/api";
import {
  getBoxCached,
  listSadaqahsCached,
  deleteBoxCached,
  emptyBoxCached,
  deleteSadaqahCached,
  listCollectionsCached,
} from "./api/cached";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";
import { Box, BoxStats, Sadaqah, Collection } from "./types";
import AddSadaqahCommand from "./add-sadaqah";
import EditBoxCommand from "./edit-box";
import CollectionDetail from "./collection-detail";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const COLLECTIONS_PER_PAGE = 5;

  const fetchBoxData = useCallback(
    async (page: number = 1) => {
      try {
        setIsLoading(true);
        const [boxResponse, sadaqahsResponse, collectionsResponse] = await Promise.all([
          getBoxCached(boxId),
          listSadaqahsCached(boxId, page, ITEMS_PER_PAGE),
          listCollectionsCached(boxId, collectionsPage, COLLECTIONS_PER_PAGE),
        ]);

        setBox(boxResponse.box);
        setStats(boxResponse.stats);
        setSadaqahs(sadaqahsResponse.sadaqahs);
        setTotalCount(sadaqahsResponse.pagination?.total || boxResponse.box.count || 0);
        setCollections(collectionsResponse.collections);
        setCollectionsTotal(collectionsResponse.pagination?.total || collectionsResponse.collections.length || 0);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load box details",
          message: getErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [boxId, collectionsPage],
  );

  useEffect(() => {
    fetchBoxData(currentPage);
  }, [fetchBoxData, currentPage, collectionsPage]);

  async function handleDeleteBox() {
    if (!box) return;

    const confirmed = await confirmAlert({
      title: "Delete Box",
      message: `Are you sure you want to delete "${box.name}"? This will also delete all ${box.count} sadaqahs in this box.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        setIsLoading(true);
        await deleteBoxCached(box.id);

        showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.BOX_DELETED,
        });

        onBoxDeleted();
        pop();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete box",
          message: getErrorMessage(error),
        });
        setIsLoading(false);
      }
    }
  }

  async function handleCollectBox() {
    if (!box || box.count === 0) return;

    const confirmed = await confirmAlert({
      title: "Collect Box",
      message: `Are you sure you want to collect "${box.name}"? This will collect all ${box.count} sadaqahs (${formatCurrency(box.totalValue, box.baseCurrency)}).`,
      primaryAction: {
        title: "Collect Box",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        setIsLoading(true);
        const response = await emptyBoxCached(box.id);

        showToast({
          style: Toast.Style.Success,
          title: "Box collected successfully",
        });

        // Navigate to collection detail view for the new collection
        if (response.collection) {
          push(<CollectionDetail collection={response.collection} box={box} />);
        }

        await fetchBoxData(currentPage);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to collect box",
          message: String(error),
        });
        setIsLoading(false);
      }
    }
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
        await fetchBoxData(currentPage);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete sadaqah",
          message: getErrorMessage(error),
        });
      }
    }
  }

  function formatCurrency(value: number | undefined | null, currency?: { code?: string; symbol?: string }): string {
    const symbol = currency?.symbol || "";
    const code = currency?.code || "";
    const numericValue = value ?? 0;

    // Use 5 decimal places for small values (e.g., gold XAU), otherwise use locale default
    const formattedValue = numericValue < 0.01 ? numericValue.toFixed(5) : numericValue.toLocaleString();

    // Avoid showing duplicate when symbol equals code (e.g., "XAU0 XAU")
    if (symbol && code && symbol === code) {
      return `${formattedValue} ${code}`;
    }

    return `${symbol}${formattedValue} ${code}`.trim();
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleViewCollectionDetail(collection: Collection) {
    if (!box) return;
    push(<CollectionDetail collection={collection} box={box} />);
  }

  if (!box) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Loading box details..." />
      </List>
    );
  }

  const baseCurrency = box.baseCurrency;

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
          <List.Item title="First Sadaqah" icon={Icon.Calendar} subtitle={formatDate(stats.firstSadaqahAt)} />
        )}
        {stats && stats.lastSadaqahAt && (
          <List.Item title="Last Sadaqah" icon={Icon.Calendar} subtitle={formatDate(stats.lastSadaqahAt)} />
        )}
      </List.Section>

      {box.description && (
        <List.Section title="Description">
          <List.Item title={box.description} icon={Icon.Text} />
        </List.Section>
      )}

      <List.Section
        title={`Sadaqahs (${totalCount})`}
        subtitle={
          totalCount > ITEMS_PER_PAGE ? `Page ${currentPage} of ${Math.ceil(totalCount / ITEMS_PER_PAGE)}` : undefined
        }
      >
        {sadaqahs.map((sadaqah) => (
          <List.Item
            key={sadaqah.id}
            title={formatCurrency(sadaqah.value, sadaqah.currency)}
            subtitle={formatDate(sadaqah.createdAt)}
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
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigation">
                  {currentPage > 1 && (
                    <Action
                      title="Previous Page"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={() => setCurrentPage((p) => p - 1)}
                    />
                  )}
                  {currentPage < Math.ceil(totalCount / ITEMS_PER_PAGE) && (
                    <Action
                      title="Next Page"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
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
            collectionsTotal > COLLECTIONS_PER_PAGE
              ? `Page ${collectionsPage} of ${Math.ceil(collectionsTotal / COLLECTIONS_PER_PAGE)}`
              : undefined
          }
        >
          {collections.map((collection) => (
            <List.Item
              key={collection.id}
              title={`Collected ${formatCurrency(collection.totalValue, collection.currency)}`}
              subtitle={formatDate(collection.emptiedAt)}
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
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                        onAction={() => setCollectionsPage((p) => p - 1)}
                      />
                    )}
                    {collectionsPage < Math.ceil(collectionsTotal / COLLECTIONS_PER_PAGE) && (
                      <Action
                        title="Next Collections"
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
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
              <Action
                title="Add Sadaqah"
                onAction={() => push(<AddSadaqahCommand box={box} onAdd={() => fetchBoxData(currentPage)} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Edit Box"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action
                title="Edit Box"
                onAction={() => push(<EditBoxCommand box={box} onUpdate={() => fetchBoxData(currentPage)} />)}
              />
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
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
