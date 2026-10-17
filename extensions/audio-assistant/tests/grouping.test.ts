import assert from "node:assert/strict";
import test from "node:test";
import { demoData } from "../src/services/demo-data";
import { groupCandidates, groupLeader, requireGroupChange } from "../src/domain/grouping";
import { searchLibrary } from "../src/domain/policy";
import { decodePlayer, resolveEffectiveQueues } from "../src/services/wire";

test("synced followers inherit the leader's actual queue without equating queue and player IDs", () => {
  const base = { name: "Fixture", provider: "fixture", available: true };
  const players = [
    decodePlayer({ ...base, player_id: "leader", active_source: "actual-queue" }),
    decodePlayer({ ...base, player_id: "child", synced_to: "leader" }),
  ];
  const resolved = resolveEffectiveQueues(players, [
    { id: "actual-queue", active: true, itemCount: 0, currentIndex: null, repeat: "off", shuffle: false },
  ]);
  assert.equal(resolved[1]?.queueId, "actual-queue");
  players[0]!.groupLeaderId = "child";
  players[0]!.activeSource = undefined;
  assert.equal(resolveEffectiveQueues(players, [])[1]?.queueId, undefined);
});
import { LiveMusicService } from "../src/services/live";
import { DemoMusicService } from "../src/services/demo";

test("compatibility uses explicit IDs, excludes offline/self/non-audio players, and preserves linked members", () => {
  const players = demoData().library.players;
  const leader = players[0]!;
  leader.canGroupWith = players.map((player) => player.id);
  assert.deepEqual(
    groupCandidates(players, leader).map((player) => player.id),
    [players[1]!.id],
  );
  assert.throws(() => groupLeader(players, players[1]!.id), /does not support/);
  assert.throws(() => requireGroupChange(players, leader.id, players[2]!.id, true), /unavailable/);
  leader.canGroupWith = [];
  assert.throws(() => requireGroupChange(players, leader.id, players[1]!.id, true), /not compatible/);
  leader.groupMemberIds = [players[1]!.id];
  leader.staticGroupMemberIds = [players[1]!.id];
  assert.equal(groupCandidates(players, leader).length, 1);
  assert.throws(() => requireGroupChange(players, leader.id, players[1]!.id, false), /permanent/);
});

test("All hides offline outputs for both discovery and search; Players retains them", () => {
  const { library } = demoData();
  assert.equal(searchLibrary(library, "all", "").filter((item) => item.kind === "player").length, 2);
  assert.equal(searchLibrary(library, "all", "kitchen").length, 0);
  assert.equal(searchLibrary(library, "players", "kitchen").length, 1);
});

test("follower cannot accidentally become a new leader and active groups resolve explicitly", () => {
  const players = demoData().library.players;
  const active = players[0]!;
  active.groupLeaderId = "another";
  assert.throws(() => groupLeader(players, active.id), /follower/);
  const group = { ...active, id: "group", playerType: "group", groupLeaderId: undefined };
  active.activeGroupId = group.id;
  assert.equal(groupLeader([...players, group], active.id).id, "group");
});

test("can_group_with alone does not grant membership control", () => {
  const player = decodePlayer({
    player_id: "id",
    name: "Player",
    provider: "sendspin",
    available: true,
    can_group_with: ["other"],
  });
  assert.equal(player.capabilities.grouping, false);
  assert.deepEqual(player.canGroupWith, ["other"]);
});

test("demo linking shares queue ownership and removal restores individual ownership", async () => {
  const service = new DemoMusicService();
  await service.setGroupMember("demo-player-0", "demo-player-1", true);
  let players = await service.getPlayers();
  assert.equal(players[1]?.queueId, players[0]?.queueId);
  await service.setGroupMember("demo-player-0", "demo-player-1", false);
  players = await service.getPlayers();
  assert.equal(players[1]?.queueId, "demo-queue-1");
});

test("live membership edits are additive, confirmed, idempotent and never replayed on timeout", async () => {
  let members: string[] = ["existing"];
  let fail = false;
  const calls: Record<string, unknown>[] = [];
  const live = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async (command, args = {}) => {
        if (command === "players/all")
          return [
            {
              player_id: "primary",
              name: "Primary",
              provider: "fixture",
              type: "player",
              available: true,
              supported_features: ["set_members"],
              can_group_with: ["member"],
              group_members: members,
            },
            {
              player_id: "member",
              name: "Member",
              provider: "different-provider",
              type: "player",
              available: true,
              supported_features: [],
              synced_to: members.includes("member") ? "primary" : null,
            },
          ];
        if (command === "player_queues/all") return [];
        if (command === "players/cmd/set_members") {
          calls.push(args);
          if (fail) throw new Error("timeout");
          members = args.player_ids_to_add ? [...members, "member"] : members.filter((id) => id !== "member");
          return null;
        }
        throw new Error(command);
      },
    },
  });
  await live.setGroupMember("primary", "member", true);
  await live.setGroupMember("primary", "member", true);
  assert.deepEqual(calls, [{ target_player: "primary", player_ids_to_add: ["member"] }]);
  assert.ok(members.includes("existing"));
  await live.setGroupMember("primary", "member", false);
  assert.deepEqual(calls[1], { target_player: "primary", player_ids_to_remove: ["member"] });
  fail = true;
  await assert.rejects(live.setGroupMember("primary", "member", true), /timeout/);
  assert.equal(calls.length, 3);
});
