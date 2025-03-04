import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import debounce from "lodash.debounce";
import groupBy from "lodash.groupby";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMoveWithCaching } from "./api";
import Descriptions from "./components/description";
import MoveMetadata from "./components/metadata/move";
import MoveLearnset from "./components/move_learnset";
import TypeDropdown from "./components/type_dropdown";
import moves from "./statics/moves.json";

export default function PokeMoves(props: { id?: number }) {
  const [type, setType] = useState<string>("all");
  const [selectedMoveId, setSelectedMoveId] = useState<number>(71);

  useEffect(() => {
    if (props.id) {
      setSelectedMoveId(props.id);
    }
  }, [props.id]);

  const { data: move, isLoading } = usePromise(fetchMoveWithCaching, [
    selectedMoveId,
  ]);

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
    const listing =
      type === "all" ? moves : moves.filter((m) => m.type === type);

    return groupBy(listing, "generation");
  }, [type]);

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
              return (
                <List.Item
                  key={m.id}
                  id={m.id.toString()}
                  title={m.name}
                  icon={`moves/${m.damage_class || "status"}.svg`}
                  keywords={[m.name]}
                  detail={
                    !isLoading && (
                      <List.Item.Detail
                        markdown={
                          move &&
                          move.pokemon_v2_moveeffect
                            ?.pokemon_v2_moveeffecteffecttexts.length
                            ? json2md([
                                {
                                  h1: m.name,
                                },
                                {
                                  p: move.pokemon_v2_moveeffect.pokemon_v2_moveeffecteffecttexts[0].short_effect.replace(
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
                                name={m.name}
                                entries={move.pokemon_v2_moveflavortexts}
                              />
                            }
                          />
                          <Action.Push
                            title="Learnset"
                            icon={Icon.List}
                            target={
                              <MoveLearnset
                                name={move.pokemon_v2_movenames[0].name}
                                moves={move.pokemon_v2_pokemonmoves}
                              />
                            }
                          />
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
