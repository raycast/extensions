import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allianceCount,
  allianceMark,
  allianceTiles,
  isAllianceList,
  isMemberOf,
  setDataVersion,
  DATA_LINE,
} from "../src/utils/airlines.ts";

const skyteam = {
  name: "SkyTeam",
  slug: "skyteam",
  founded: 2000,
  assets: { icon: { color: true, mono: true, colors: ["#1a3576"] } },
};
const value = {
  name: "Value Alliance",
  slug: "value-alliance",
  founded: 2016,
  defunct: true,
  ceased: 2023,
  assets: {},
};
const cdn = "https://cdn.jsdelivr.net/npm/soaring-symbols";

describe("isAllianceList", () => {
  it("accepts alliances, those without marks included", () => {
    assert.equal(isAllianceList([skyteam, value]), true);
  });

  it("rejects anything else", () => {
    for (const data of [[], {}, null, [{ name: "SkyTeam" }], [{ ...skyteam, assets: null }]]) {
      assert.equal(isAllianceList(data), false, JSON.stringify(data));
    }
  });
});

describe("allianceTiles", () => {
  it("lists the color and mono files from the data release", () => {
    setDataVersion(`${DATA_LINE}.0`);
    assert.deepEqual(allianceTiles(skyteam as never), [
      {
        variant: "icon",
        url: `${cdn}@${DATA_LINE}.0/dist/alliances/skyteam/icon.svg`,
        fileName: "skyteam-icon.svg",
        mono: false,
      },
      {
        variant: "icon-mono",
        url: `${cdn}@${DATA_LINE}.0/dist/alliances/skyteam/icon-mono.svg`,
        fileName: "skyteam-icon-mono.svg",
        mono: true,
      },
    ]);
    setDataVersion();
  });

  it("gives an alliance without marks no tiles and no mark", () => {
    assert.deepEqual(allianceTiles(value as never), []);
    assert.equal(allianceMark(value as never), undefined);
    assert.equal(allianceMark(undefined), undefined);
  });
});

describe("isMemberOf", () => {
  const airline = { name: "Vietnam Airlines", slug: "vietnam-airlines", alliance: "SkyTeam", assets: {} };
  const scoot = {
    name: "Scoot",
    slug: "scoot",
    assets: {},
    alliance_history: [{ alliance: "Value Alliance", since: 2016, until: 2023 }],
  };
  const left = { ...scoot, alliance_history: [{ alliance: "SkyTeam", since: 2007, until: 2018 }] };

  it("counts the current members of an active alliance only", () => {
    assert.equal(isMemberOf(airline as never, skyteam as never), true);
    assert.equal(isMemberOf(left as never, skyteam as never), false);
  });

  it("counts every airline that flew in a disbanded one", () => {
    assert.equal(isMemberOf(scoot as never, value as never), true);
    assert.equal(isMemberOf(airline as never, value as never), false);
  });
});

describe("allianceCount", () => {
  const flying = { name: "Vietnam Airlines", slug: "vietnam-airlines", alliance: "SkyTeam", assets: {} };
  const ceased = { ...flying, name: "Air Old", slug: "air-old", defunct: true };
  const scoot = {
    name: "Scoot",
    slug: "scoot",
    assets: {},
    alliance_history: [{ alliance: "Value Alliance", since: 2016, until: 2023 }],
  };

  it("counts the airlines still flying in an active alliance", () => {
    assert.equal(allianceCount(skyteam as never, [flying, ceased, scoot] as never), "1 in the collection");
  });

  it("counts every airline that flew in a disbanded one", () => {
    assert.equal(allianceCount(value as never, [flying, scoot] as never), "1 flew in it");
  });
});
