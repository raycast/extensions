import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import debounce from "lodash.debounce";
import groupBy from "lodash.groupby";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMove, fetchMoves } from "./api";
import Descriptions from "./components/description";
import MoveMetadata from "./components/metadata/move";
import MoveLearnset from "./components/move_learnset";
import TypeDropdown from "./components/type_dropdown";

export default function PokeMoves(props: {
  id?: number;
  arguments?: { search?: string };
}) {
  const { search } = props.arguments || {};

  const { data: moves, isLoading } = usePromise(fetchMoves);

  const [type, setType] = useState<string>("all");
  const [selectedMoveId, setSelectedMoveId] = useState<number>(71);

  useEffect(() => {
    if (props.id) {
      setSelectedMoveId(props.id);
    }
  }, [props.id]);

  const { data: move } = usePromise(fetchMove, [selectedMoveId]);

  const debouncedSelectionChange = useCallback(
    debounce((index: string | null) => {
      if (index) {
        setSelectedMoveId(parseInt(index));
      }
    }, 300),
    [],
  );

  const onSelectionChange = (index: string | null) => {
    debouncedSelectionChange(index);
  };

  const generations = useMemo(() => {
    let listing =
      type === "all" ? moves : moves?.filter((m) => m.type.name === type);

    if (search) {
      listing = listing?.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return groupBy(listing, "generation.generationnames.0.name");
  }, [moves, type, search]);

  return (
    <List
      throttle
      navigationTitle="Moves"
      isShowingDetail={true}
      searchBarAccessory={
        <TypeDropdown command="Move" onSelectType={setType} />
      }
      selectedItemId={String(selectedMoveId)}
      onSelectionChange={onSelectionChange}
      isLoading={isLoading}
    >
      {Object.entries(generations).map(([generation, moves]) => {
        return (
          <List.Section key={generation} title={generation}>
            {moves.map((m) => {
              const moveName = m.movenames[0]?.name || m.name;

              return (
                <List.Item
                  key={m.id}
                  id={m.id.toString()}
                  title={moveName}
                  icon={`moves/${m.movedamageclass.name || "status"}.svg`}
                  keywords={[m.name, moveName]}
                  detail={
                    move && (
                      <List.Item.Detail
                        markdown={
                          move && move.moveeffect?.moveeffecteffecttexts.length
                            ? json2md([
                                {
                                  h1: moveName,
                                },
                                {
                                  p: move.moveeffect.moveeffecteffecttexts[0].short_effect.replace(
                                    "$effect_chance",
                                    String(move.move_effect_chance),
                                  ),
                                },
                              ])
                            : undefined
                        }
                        metadata={move && <MoveMetadata move={move} />}
                      />
                    )
                  }
                  actions={
                    move && (
                      <ActionPanel>
                        <ActionPanel.Section title="Information">
                          <Action.Push
                            title="Descriptions"
                            icon={Icon.List}
                            target={
                              <Descriptions
                                name={moveName}
                                entries={move.moveflavortexts}
                              />
                            }
                          />
                          {move.movenames.length > 0 && (
                            <Action.Push
                              title="Learnset"
                              icon={Icon.LightBulb}
                              target={
                                <MoveLearnset
                                  name={moveName}
                                  moves={move.pokemonmoves}
                                />
                              }
                            />
                          )}
                        </ActionPanel.Section>
                      </ActionPanel>
                    )
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
