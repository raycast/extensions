import { useState, useEffect, useCallback, useRef } from "react";
import { List, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Color, Image, Keyboard } from "@raycast/api";
import { listBoxesCached, getStatsCached, addSadaqahCached, listCurrenciesCached } from "./api/cached";
import { confirmAndCollectBox, confirmAndDeleteBox } from "./hooks/useBoxActions";
import { Box, StatsResponse, Preset, Currency } from "./types";
import { getErrorMessage } from "./utils/error-handler";
import { formatCurrency, formatDate, formatNumber } from "./utils/format";
import BoxDetail from "./views/BoxDetail";
import CollectionDetail from "./views/CollectionDetail";
import CreateBoxForm from "./views/CreateBoxForm";
import EditBoxForm from "./views/EditBoxForm";
import AddSadaqahForm from "./views/AddSadaqahForm";
import ManagePresetsCommand from "./manage-presets";
import { getPresets, getDefaultPreset } from "./storage/presets-storage";

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
  const hasSetInitialSelection = useRef(false);

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

      const fetchedBoxes = boxesResponse.boxes;
      setBoxes(fetchedBoxes);
      setStats(statsResponse);
      setPresets(loadedPresets);
      setDefaultPreset(loadedDefaultPreset);
      setCurrencies(currenciesResponse.currencies);

      if (fetchedBoxes.length > 0) {
        const currentSelection = selectedBoxIdRef.current;
        if (preserveSelection && currentSelection) {
          const stillExists = fetchedBoxes.some((b: Box) => b.id === currentSelection);
          if (!stillExists) {
            setSelectedBoxId(fetchedBoxes[0].id);
          }
        } else if (!hasSetInitialSelection.current) {
          hasSetInitialSelection.current = true;
          setSelectedBoxId(fetchedBoxes[0].id);
        }
      }
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
    fetchData(false);
  }, [fetchData]);

  async function handleDeleteBox(box: Box) {
    await confirmAndDeleteBox(box, {
      onDeleted: () => fetchData(true),
    });
  }

  async function handleCollectBox(box: Box) {
    await confirmAndCollectBox(box, {
      onCollected: async (response) => {
        if (response.collection) {
          push(<CollectionDetail collection={response.collection} box={response.box || box} />);
        }
        await fetchData(true);
      },
    });
  }

  async function handleAddPresetSadaqah(box: Box, preset: Preset) {
    const amount = preset.amount || 1;
    const totalValue = preset.value * amount;

    const currency = currencies.find((c: Currency) => c.id === preset.currencyId);
    const currencyDisplay = currency ? `${currency.name} (${currency.code})` : preset.currencyId;

    try {
      await addSadaqahCached(box.id, {
        value: preset.value,
        currencyId: preset.currencyId,
        amount,
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

  const refreshAfterMutation = () => fetchData(true);

  const statsData = stats?.stats;
  const totalBoxes = statsData?.totalBoxes ?? boxes.length;
  const totalSadaqahs = statsData?.totalSadaqahs ?? boxes.reduce((sum, box) => sum + (box.count ?? 0), 0);
  const totalValue =
    statsData?.convertedTotal?.value ??
    statsData?.totalValue ??
    boxes.reduce((sum, box) => sum + (box.totalValue ?? 0), 0);
  const primaryCurrency =
    statsData?.convertedTotal?.currency ??
    statsData?.primaryCurrency ??
    boxes.find((b) => b.baseCurrency)?.baseCurrency ??
    undefined;

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
                  onAction={() => push(<CreateBoxForm onCreate={refreshAfterMutation} />)}
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
                            push(
                              <BoxDetail
                                boxId={box.id}
                                onBoxDeleted={refreshAfterMutation}
                                onSadaqahDeleted={refreshAfterMutation}
                              />,
                            )
                          }
                        />
                        <Action
                          title="Add Sadaqah"
                          icon={{ source: Icon.Plus, tintColor: Color.Green }}
                          onAction={() => push(<AddSadaqahForm box={box} onAdd={refreshAfterMutation} />)}
                        />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        <Action
                          title="Open Box"
                          icon={Icon.ArrowRight}
                          onAction={() =>
                            push(
                              <BoxDetail
                                boxId={box.id}
                                onBoxDeleted={refreshAfterMutation}
                                onSadaqahDeleted={refreshAfterMutation}
                              />,
                            )
                          }
                        />
                        <Action
                          title="Add Sadaqah"
                          icon={{ source: Icon.Plus, tintColor: Color.Green }}
                          onAction={() => push(<AddSadaqahForm box={box} onAdd={refreshAfterMutation} />)}
                        />
                      </ActionPanel.Section>
                    )}

                    {presets.length > 0 && (
                      <ActionPanel.Section title="Presets">
                        {presets.slice(0, 9).map((preset, index) => {
                          const key = String(index + 1) as "1" | "2" | "3" | "4" | "5";
                          return (
                            <Action
                              key={preset.id}
                              title={`Add ${preset.name}`}
                              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                              onAction={() => handleAddPresetSadaqah(box, preset)}
                              shortcut={
                                index < 5
                                  ? {
                                      macOS: { modifiers: ["cmd", "shift"], key },
                                      Windows: { modifiers: ["ctrl", "shift"], key },
                                    }
                                  : undefined
                              }
                            />
                          );
                        })}
                        <Action
                          title="Manage Presets…"
                          icon={Icon.Gear}
                          onAction={() => push(<ManagePresetsCommand onPresetsChanged={refreshAfterMutation} />)}
                        />
                      </ActionPanel.Section>
                    )}

                    <ActionPanel.Section>
                      <Action
                        title="Edit Box"
                        icon={Icon.Pencil}
                        onAction={() => push(<EditBoxForm box={box} onUpdate={refreshAfterMutation} />)}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                      {box.count > 0 && (
                        <Action
                          title="Collect Box"
                          icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
                          onAction={() => handleCollectBox(box)}
                          shortcut={Keyboard.Shortcut.Common.Open}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title="Delete Box"
                        icon={{ source: Icon.Trash, tintColor: Color.Red }}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteBox(box)}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "d" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                        }}
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
              <Action title="Create Box" onAction={() => push(<CreateBoxForm onCreate={refreshAfterMutation} />)} />
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
                onAction={() => push(<ManagePresetsCommand onPresetsChanged={refreshAfterMutation} />)}
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
