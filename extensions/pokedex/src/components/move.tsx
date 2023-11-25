import { useMemo, useState } from "react";
import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { PokemonV2Pokemonmove } from "../types";

export default function PokemonMoves(props: {
  name: string;
  moves: PokemonV2Pokemonmove[];
}) {
  const moves = props.moves.map((m) => {
    m.pokemon_v2_move.pokemon_v2_machines =
      m.pokemon_v2_move.pokemon_v2_machines.filter(
        (tm) => tm.version_group_id === m.pokemon_v2_versiongroup.id
      );
    return m;
  });

  const versionGroups = moves.reduce((out: { [name: string]: string }, cur) => {
    out[cur.pokemon_v2_versiongroup.id] =
      cur.pokemon_v2_versiongroup.pokemon_v2_versions
        .map((v) => v.pokemon_v2_versionnames[0]?.name || v.name)
        .join("/");
    return out;
  }, {});

  const [versionGroup, setVersionGroup] = useState<string>();

  const pokemonMoves = useMemo(() => {
    const moves = versionGroup
      ? props.moves.filter(
          (m) => m.pokemon_v2_versiongroup.id.toString() === versionGroup
        )
      : props.moves;

    return groupBy(
      moves,
      (m) =>
        m.pokemon_v2_movelearnmethod.pokemon_v2_movelearnmethodnames[0].name
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
          {Object.entries(versionGroups)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([key, value]) => (
              <List.Dropdown.Item key={key} value={key} title={value} />
            ))}
        </List.Dropdown>
      }
    >
      {Object.entries(pokemonMoves).map(([method, methodMoves]) => {
        const moves =
          method === "Machine"
            ? methodMoves.sort(
                (a, b) =>
                  a.pokemon_v2_move.pokemon_v2_machines[0].machine_number -
                  b.pokemon_v2_move.pokemon_v2_machines[0].machine_number
              )
            : methodMoves;

        return (
          <List.Section title={method} key={method}>
            {moves.map((move) => {
              let text;
              switch (move.move_learn_method_id) {
                case 1:
                  text = move.level.toString();
                  break;
                case 4:
                  text = `TM${move.pokemon_v2_move.pokemon_v2_machines[0].machine_number
                    .toString()
                    .padStart(2, "0")}`;
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
                  accessories={[
                    {
                      text,
                    },
                    {
                      tooltip:
                        move.pokemon_v2_move.pokemon_v2_type
                          .pokemon_v2_typenames[0].name,
                      icon: `types/${move.pokemon_v2_move.pokemon_v2_type.name}.svg`,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          h1: move.pokemon_v2_move.pokemon_v2_movenames[0].name,
                        },
                        {
                          p: move.pokemon_v2_move.pokemon_v2_moveeffect
                            .pokemon_v2_moveeffecteffecttexts[0]
                            ? move.pokemon_v2_move.pokemon_v2_moveeffect.pokemon_v2_moveeffecteffecttexts[0].short_effect.replace(
                                "$effect_chance",
                                move.pokemon_v2_move.move_effect_chance?.toString() ??
                                  ""
                              )
                            : "",
                        },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
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
