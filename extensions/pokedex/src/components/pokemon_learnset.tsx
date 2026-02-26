import { Action, ActionPanel, Icon, List } from "@raycast/api";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import { useMemo, useState } from "react";
import PokeMoves from "../move";
import { Move, PokemonMove } from "../types";
import MoveMetadata from "./metadata/move";

const getMoveName = (move: Move) => {
  return move.movenames[0]?.name || move.name;
};

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
      generation: groups[0].versiongroup.generation.generationnames[0].name,
      version_groups: Object.entries(versiongroups).map(([name, entries]) => ({
        key: name,
        value: name,
        title: entries[0].versiongroup.versions
          .map((v) => v.versionnames[0].name)
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

    return groupBy(
      moves,
      (m) => m.movelearnmethod.movelearnmethodnames[0].name,
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
            sortedMoves = orderBy(moves, (m) => getMoveName(m.move));
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

              const moveName = getMoveName(move.move);

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
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Information">
                        <Action.Push
                          title="View Move Details"
                          icon={Icon.Sidebar}
                          target={<PokeMoves id={move.move_id} />}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
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
