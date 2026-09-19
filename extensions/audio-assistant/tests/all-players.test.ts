import assert from "node:assert/strict";
import test from "node:test";
import { allPlayers } from "../src/domain/all-players";
import { demoData } from "../src/services/demo-data";
import { itemKey } from "../src/domain/policy";

test("All puts the saved output first once, even when server order starts elsewhere", () => {
  const { players } = demoData().library;
  const saved = players[1]!;
  const layout = allPlayers(players, saved.id, "");
  assert.equal(layout.active, saved);
  assert.deepEqual(
    layout.others.map((p) => p.id),
    [players[0]!.id],
  );
  const changed = allPlayers(players, players[0]!.id, "");
  assert.equal(changed.active, players[0]);
  assert.equal(itemKey(changed.others[0]!), itemKey(saved));
  assert.equal(players[0]!.id, "demo-player-0");
});

test("active groups use current session state and obey search filtering", () => {
  const { players } = demoData().library;
  const group = { ...players[1]!, playerType: "group", volume: 12, muted: true };
  const live = [players[0]!, group];
  assert.equal(allPlayers(live, group.id, "desk").active, group);
  assert.equal(allPlayers(live, group.id, "living").active, undefined);
  assert.deepEqual(allPlayers(live, group.id, "living").others, [players[0]]);
  assert.equal(allPlayers(live, group.id, "music title").others.length, 0);
});

test("missing, offline, and failed output resolution never substitute an active player", () => {
  const { players } = demoData().library;
  for (const id of ["removed", players[2]!.id]) {
    const layout = allPlayers(players, id, "");
    assert.equal(layout.active, undefined);
    assert.match(layout.status!, /unavailable/);
    assert.ok(layout.others.every((p) => p.available));
  }
  const unset = allPlayers(players, undefined, "");
  assert.equal(unset.status, undefined);
  assert.equal(unset.active, undefined);
  const failed = allPlayers(players, players[1]!.id, "", "Resolution failed");
  assert.equal(failed.active, undefined);
  assert.equal(failed.status, "Resolution failed");
});
