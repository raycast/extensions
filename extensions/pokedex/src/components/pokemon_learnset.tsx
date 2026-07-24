import { List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import { useMemo, useState } from "react";
import { PokemonMove } from "../types";
import { getLocalizedName } from "../utils";
import MoveMetadata from "./metadata/move";

export default function PokemonLearnset(props: {
  name: string;
  moves: PokemonMove[];
}) {
  const moves = props.moves.map((m) => {
    m.move.machines = m.move.machines.filter(
      (tm) => tm.version_group_id === m.versiongroup.id,
    );
    return m;
  });

  let generations = Object.entries(
    groupBy(moves, (m) => m.versiongroup.generation_id),
  ).map(([generation_id, groups]) => {
    const versiongroups = groupBy(groups, (g) => g.versiongroup.name);

    return {
      generation_id,
      generation: getLocalizedName(
        groups[0].versiongroup.generation.generationnames,
        groups[0].versiongroup.generation.name,
      ),
      version_groups: Object.entries(versiongroups).map(([name, entries]) => ({
        key: name,
        value: name,
        title: entries[0].versiongroup.versions
          .map((v) => getLocalizedName(v.versionnames, v.name))
          .join(" & "),
      })),
    };
  });

  generations = orderBy(generations, "generation_id", "desc");

  const [versionGroup, setVersionGroup] = useState<string>();

  const pokemonMoves = useMemo(() => {
    const moves = versionGroup
      ? props.moves.filter((m) => m.versiongroup.name === versionGroup)
      : props.moves;

    // split evolution moves to another section
    moves.forEach((move) => {
      if (move.move_learn_method_id === 1 && move.level === 0) {
        move.movelearnmethod.movelearnmethodnames[0].name = "Evolution";
      }
    });

    return groupBy(moves, (m) =>
      getLocalizedName(
        m.movelearnmethod.movelearnmethodnames,
        m.movelearnmethod.name,
      ),
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
              (m) => m.move.machines[0]?.machine_number,
            );
            break;
          case "Egg":
          case "Evolution":
          case "Tutor":
            sortedMoves = orderBy(moves, (m) =>
              getLocalizedName(m.move.movenames, m.move.name),
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
                  text = move.level ? move.level.toString() : undefined;
                  break;
                case 4:
                  text = move.move.machines[0]
                    ? `TM${move.move.machines[0]?.machine_number
                        .toString()
                        .padStart(3, "0")}`
                    : "";
                // eslint-disable-next-line no-fallthrough
                default:
                  break;
              }

              const moveName = getLocalizedName(
                move.move.movenames,
                move.move.name,
              );

              return (
                <List.Item
                  key={`${move.versiongroup.name}-${move.move_learn_method_id}-${move.level}-${move.move_id}`}
                  title={moveName}
                  keywords={[moveName]}
                  icon={`moves/${move.move.movedamageclass.name}.svg`}
                  accessories={[{ text }]}
                  detail={
                    <List.Item.Detail
                      markdown={
                        move.move.moveeffect?.moveeffecteffecttexts.length
                          ? json2md([
                              {
                                h1: moveName,
                              },
                              {
                                p: move.move.moveeffect.moveeffecteffecttexts[0].short_effect.replace(
                                  "$effect_chance",
                                  String(move.move.move_effect_chance),
                                ),
                              },
                            ])
                          : undefined
                      }
                      metadata={<MoveMetadata move={move.move} />}
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
