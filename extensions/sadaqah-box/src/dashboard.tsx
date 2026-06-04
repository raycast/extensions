import { useState, useEffect, useCallback, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Color,
  confirmAlert,
  Alert,
  Image,
} from "@raycast/api";
import {
  listBoxesCached,
  deleteBoxCached,
  emptyBoxCached,
  getStatsCached,
  addSadaqahCached,
  listCurrenciesCached,
} from "./api/cached";
import { Box, StatsResponse, Preset, Currency } from "./types";
import { getErrorMessage } from "./utils/error-handler";
import { SUCCESS_MESSAGES } from "./constants";
import BoxDetail from "./box-detail";
import CollectionDetail from "./collection-detail";
import CreateBoxCommand from "./create-box";
import EditBoxCommand from "./edit-box";
import AddSadaqahCommand from "./add-sadaqah";
import ManagePresetsCommand from "./manage-presets";
import { getPresets, getDefaultPreset } from "./presets-storage";

export default function DashboardCommand() {
  const { push } = useNavigation();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [defaultPreset, setDefaultPreset] = useState<Preset | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | undefined>(undefined);

  const selectedBoxIdRef = useRef<string | undefined>(selectedBoxId);
  selectedBoxIdRef.current = selectedBoxId;

  const fetchData = useCallback(async (preserveSelection = false) => {
    try {
      setIsLoading(true);
      const [boxesResponse, statsResponse, loadedPresets, loadedDefaultPreset, currenciesResponse] = await Promise.all([
        listBoxesCached("createdAt", "desc"),
        getStatsCached(),
        getPresets(),
        getDefaultPreset(),
        listCurrenciesCached(),
      ]);

      setBoxes((prevBoxes) => {
        // Preserve selection if requested and we have boxes
        const currentSelection = selectedBoxIdRef.current;
        if (preserveSelection && currentSelection && prevBoxes.length > 0) {
          const stillExists = boxesResponse.boxes.some((b: Box) => b.id === currentSelection);
          if (!stillExists && boxesResponse.boxes.length > 0) {
            // If selected box was deleted, select first available
            setSelectedBoxId(boxesResponse.boxes[0].id);
          }
        }
        return boxesResponse.boxes;
      });
      setStats(statsResponse);
      setPresets(loadedPresets);
      setDefaultPreset(loadedDefaultPreset);
      setCurrencies(currenciesResponse.currencies);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update selected box when boxes are loaded initially
  // Use a ref to prevent resetting selection on subsequent updates
  const hasSetInitialSelection = useRef(false);
  useEffect(() => {
    if (!isLoading && boxes.length > 0 && !hasSetInitialSelection.current) {
      hasSetInitialSelection.current = true;
      setSelectedBoxId(boxes[0].id);
    }
  }, [isLoading, boxes]);

  async function handleDeleteBox(box: Box) {
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
        await deleteBoxCached(box.id);

        showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.BOX_DELETED,
        });

        await fetchData(true);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete box",
          message: getErrorMessage(error),
        });
      }
    }
  }

  async function handleCollectBox(box: Box) {
    if (box.count === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Box is already empty",
      });
      return;
    }

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
        const response = await emptyBoxCached(box.id);

        showToast({
          style: Toast.Style.Success,
          title: "Box collected successfully",
        });

        // Navigate to collection detail view for the new collection
        if (response.collection) {
          push(<CollectionDetail collection={response.collection} box={box} />);
        }

        await fetchData(true);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to collect box",
          message: getErrorMessage(error),
        });
      }
    }
  }

  async function handleAddPresetSadaqah(box: Box, preset: Preset) {
    const amount = preset.amount || 1;
    const totalValue = preset.value * amount;

    // Get currency info for display
    const currency = currencies.find((c: Currency) => c.id === preset.currencyId);
    const currencyDisplay = currency ? `${currency.name} (${currency.code})` : preset.currencyId;

    // Format numbers to max 5 decimal places
    const formatNumber = (num: number): string => {
      return num.toLocaleString(undefined, { maximumFractionDigits: 5 });
    };

    try {
      await addSadaqahCached(box.id, {
        value: totalValue,
        currencyId: preset.currencyId,
        amount: amount,
      });

      showToast({
        style: Toast.Style.Success,
        title: `Added ${preset.name}`,
        message: `${formatNumber(amount)} × ${formatNumber(preset.value)} ${currencyDisplay} = ${formatNumber(totalValue)} ${currencyDisplay}`,
      });

      await fetchData(true);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add sadaqah",
        message: getErrorMessage(error),
      });
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
    });
  }

  // Calculate totals from boxes array (more reliable than stats API)
  const totalBoxes = boxes.length;
  const totalSadaqahs = boxes.reduce((sum, box) => sum + (box.count ?? 0), 0);
  const totalValue = boxes.reduce((sum, box) => sum + (box.totalValue ?? 0), 0);
  // Get primary currency from first box with a currency, or from stats
  const primaryCurrency = boxes.find((b) => b.baseCurrency)?.baseCurrency || stats?.primaryCurrency || undefined;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search boxes..."
      navigationTitle="Sadaqah Boxes"
      selectedItemId={selectedBoxId}
    >
      <List.Section title="Boxes">
        {boxes.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No boxes found"
            description="Create your first sadaqah box to get started"
            icon={Icon.Box}
            actions={
              <ActionPanel>
                <Action
                  title="Create Box"
                  icon={Icon.Plus}
                  onAction={() => push(<CreateBoxCommand onCreate={fetchData} />)}
                />
              </ActionPanel>
            }
          />
        ) : (
          boxes.map((box) => {
            const baseCurrency = box.baseCurrency;
            const hasExtraValues = box.totalValueExtra && Object.keys(box.totalValueExtra).length > 0;

            return (
              <List.Item
                id={box.id}
                key={box.id}
                title={box.name}
                subtitle={box.description || undefined}
                icon={Icon.Box}
                accessories={[
                  { text: `${box.count} sadaqahs`, icon: Icon.Coin },
                  { text: formatCurrency(box.totalValue, baseCurrency) },
                ]}
                actions={
                  <ActionPanel>
                    {defaultPreset ? (
                      <ActionPanel.Section>
                        <Action
                          title={`Add ${defaultPreset.name}`}
                          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                          onAction={() => handleAddPresetSadaqah(box, defaultPreset)}
                        />
                        <Action
                          title="Open Box"
                          icon={Icon.ArrowRight}
                          onAction={() =>
                            push(<BoxDetail boxId={box.id} onBoxDeleted={fetchData} onSadaqahDeleted={fetchData} />)
                          }
                        />
                        <Action
                          title="Add Sadaqah"
                          icon={{ source: Icon.Plus, tintColor: Color.Green }}
                          onAction={() => push(<AddSadaqahCommand box={box} onAdd={fetchData} />)}
                        />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        <Action
                          title="Open Box"
                          icon={Icon.ArrowRight}
                          onAction={() =>
                            push(<BoxDetail boxId={box.id} onBoxDeleted={fetchData} onSadaqahDeleted={fetchData} />)
                          }
                        />
                        <Action
                          title="Add Sadaqah"
                          icon={{ source: Icon.Plus, tintColor: Color.Green }}
                          onAction={() => push(<AddSadaqahCommand box={box} onAdd={fetchData} />)}
                        />
                      </ActionPanel.Section>
                    )}

                    {presets.length > 0 && (
                      <ActionPanel.Section title="Presets">
                        {presets.slice(0, 9).map((preset, index) => (
                          <Action
                            key={preset.id}
                            title={`Add ${preset.name}`}
                            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                            onAction={() => handleAddPresetSadaqah(box, preset)}
                            shortcut={
                              index < 5
                                ? { modifiers: ["cmd", "shift"], key: String(index + 1) as "1" | "2" | "3" | "4" | "5" }
                                : undefined
                            }
                          />
                        ))}
                        <Action
                          title="Manage Presets…"
                          icon={Icon.Gear}
                          onAction={() => push(<ManagePresetsCommand onPresetsChanged={fetchData} />)}
                        />
                      </ActionPanel.Section>
                    )}

                    <ActionPanel.Section>
                      <Action
                        title="Edit Box"
                        icon={Icon.Pencil}
                        onAction={() => push(<EditBoxCommand box={box} onUpdate={fetchData} />)}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      {box.count > 0 && (
                        <Action
                          title="Collect Box"
                          icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
                          onAction={() => handleCollectBox(box)}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title="Delete Box"
                        icon={{ source: Icon.Trash, tintColor: Color.Red }}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteBox(box)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={box.name} />
                        {box.description && (
                          <List.Item.Detail.Metadata.Label title="Description" text={box.description} />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Sadaqahs" text={String(box.count)} />
                        <List.Item.Detail.Metadata.Label
                          title="Total Value"
                          text={formatCurrency(box.totalValue, baseCurrency)}
                        />
                        {hasExtraValues && (
                          <List.Item.Detail.Metadata.Label
                            title="Extra Values"
                            text={Object.entries(box.totalValueExtra!)
                              .map(([, v]) => `${v.total} ${v.code}`)
                              .join(", ")}
                          />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Base Currency"
                          text={baseCurrency ? `${baseCurrency.name} (${baseCurrency.code})` : box.baseCurrencyId}
                        />
                        <List.Item.Detail.Metadata.Label title="Created" text={formatDate(box.createdAt)} />
                        <List.Item.Detail.Metadata.Label title="Updated" text={formatDate(box.updatedAt)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            );
          })
        )}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Create New Box"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Create Box" onAction={() => push(<CreateBoxCommand onCreate={fetchData} />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage Presets"
          subtitle={`${presets.length} preset${presets.length !== 1 ? "s" : ""} configured`}
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action
                title="Manage Presets"
                onAction={() => push(<ManagePresetsCommand onPresetsChanged={fetchData} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Summary">
        <List.Item
          title={`Total Value: ${formatCurrency(totalValue, primaryCurrency)}`}
          subtitle={`${totalBoxes} boxes · ${totalSadaqahs} sadaqahs`}
          icon={{ source: Icon.Coin, tintColor: Color.Yellow }}
        />
      </List.Section>
      <List.Section title="Sponsored">
        <List.Item
          title="Sponsored by erklab"
          icon={{
            source: "erklab-logo.png",
            mask: Image.Mask.RoundedRectangle,
          }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://erklab.com" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
