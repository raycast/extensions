import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import { useMemo, useState } from "react";
import { PokemonV2Pokemonmove } from "../types";
import { typeColor } from "../utils";

export default function PokemonMoves(props: {
  name: string;
  moves: PokemonV2Pokemonmove[];
}) {
  const moves = props.moves.map((m) => {
    m.pokemon_v2_move.pokemon_v2_machines =
      m.pokemon_v2_move.pokemon_v2_machines.filter(
        (tm) => tm.version_group_id === m.pokemon_v2_versiongroup.id,
      );
    return m;
  });

  let generations = Object.entries(
    groupBy(moves, (m) => m.pokemon_v2_versiongroup.generation_id),
  ).map(([generation_id, groups]) => {
    const versiongroups = groupBy(
      groups,
      (g) => g.pokemon_v2_versiongroup.name,
    );

    return {
      generation_id,
      generation:
        groups[0].pokemon_v2_versiongroup.pokemon_v2_generation
          .pokemon_v2_generationnames[0].name,
      version_groups: Object.entries(versiongroups).map(([name, entries]) => ({
        key: name,
        value: name,
        title: entries[0].pokemon_v2_versiongroup.pokemon_v2_versions
          .map((v) => v.pokemon_v2_versionnames[0].name)
          .join(" & "),
      })),
    };
  });

  generations = orderBy(generations, "generation_id", "desc");

  const [versionGroup, setVersionGroup] = useState<string>();

  const pokemonMoves = useMemo(() => {
    const moves = versionGroup
      ? props.moves.filter(
          (m) => m.pokemon_v2_versiongroup.name === versionGroup,
        )
      : props.moves;

    return groupBy(
      moves,
      (m) =>
        m.pokemon_v2_movelearnmethod.pokemon_v2_movelearnmethodnames[0].name,
    );
  }, [versionGroup]);

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Learnset`}
      isShowingDetail={Boolean(props.moves.length)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Version Group"
          onChange={setVersionGroup}
        >
          {generations.map(({ generation_id, generation, version_groups }) => {
            return (
              <List.Dropdown.Section key={generation_id} title={generation}>
                {version_groups.map(({ key, value, title }) => {
                  return (
                    <List.Dropdown.Item key={key} value={value} title={title} />
                  );
                })}
              </List.Dropdown.Section>
            );
          })}
        </List.Dropdown>
      }
    >
      {Object.entries(pokemonMoves).map(([method, moves]) => {
        let sortedMoves;
        switch (method) {
          case "Machine":
            sortedMoves = orderBy(
              moves,
              (m) => m.pokemon_v2_move.pokemon_v2_machines[0]?.machine_number,
            );
            break;
          case "Egg":
          case "Tutor":
            sortedMoves = orderBy(
              moves,
              (m) => m.pokemon_v2_move.pokemon_v2_movenames[0].name,
            );
            break;
          case "Level up":
            sortedMoves = orderBy(moves, (m) => m.level);
            break;
          default:
            sortedMoves = moves;
            break;
        }

        return (
          <List.Section title={method} key={method}>
            {sortedMoves.map((move) => {
              let text;
              switch (move.move_learn_method_id) {
                case 1:
                  text = move.level.toString();
                  break;
                case 4:
                  text = move.pokemon_v2_move.pokemon_v2_machines[0]
                    ? `TM${move.pokemon_v2_move.pokemon_v2_machines[0]?.machine_number
                        .toString()
                        .padStart(3, "0")}`
                    : "";
                // eslint-disable-next-line no-fallthrough
                default:
                  break;
              }

              return (
                <List.Item
                  key={`${move.pokemon_v2_versiongroup.name}-${move.move_learn_method_id}-${move.level}-${move.move_id}`}
                  title={move.pokemon_v2_move.pokemon_v2_movenames[0].name}
                  keywords={[move.pokemon_v2_move.pokemon_v2_movenames[0].name]}
                  icon={`moves/${move.pokemon_v2_move.pokemon_v2_movedamageclass.pokemon_v2_movedamageclassnames[0].name}.svg`}
                  accessories={[{ text }]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: move.pokemon_v2_move.pokemon_v2_movenames[0].name,
                        },
                        {
                          p: move.pokemon_v2_move.pokemon_v2_moveeffect
                            ?.pokemon_v2_moveeffecteffecttexts[0]
                            ? move.pokemon_v2_move.pokemon_v2_moveeffect?.pokemon_v2_moveeffecteffecttexts[0].short_effect.replace(
                                "$effect_chance",
                                move.pokemon_v2_move.move_effect_chance?.toString() ??
                                  "",
                              )
                            : "",
                        },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Type">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={
                                move.pokemon_v2_move.pokemon_v2_type
                                  .pokemon_v2_typenames[0].name
                              }
                              icon={`types/${move.pokemon_v2_move.pokemon_v2_type.name}.svg`}
                              color={
                                typeColor[
                                  move.pokemon_v2_move.pokemon_v2_type.name
                                ]
                              }
                            />
                          </List.Item.Detail.Metadata.TagList>

                          <List.Item.Detail.Metadata.Label
                            title="Power"
                            text={move.pokemon_v2_move.power?.toString() || "-"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Accuracy"
                            text={
                              move.pokemon_v2_move.accuracy
                                ? move.pokemon_v2_move.accuracy + "%"
                                : "-"
                            }
                          />
                          <List.Item.Detail.Metadata.Label
                            title="PP"
                            text={move.pokemon_v2_move.pp?.toString() || "-"}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
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
