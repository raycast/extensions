import express, { Request, Response } from "express";
import cors from "cors";

const ENVIRONMENTS = [
  { key: "dev", name: "Development", color: "7B42BC", critical: false },
  { key: "qa", name: "QA", color: "F5A623", critical: false },
  { key: "staging", name: "Staging", color: "417505", critical: false },
  { key: "production", name: "Production", color: "D0021B", critical: true },
  { key: "demo", name: "Demo", color: "4A90E2", critical: false },
];
const ENV_KEYS = ENVIRONMENTS.map((e) => e.key);
const envName = (key: string) => ENVIRONMENTS.find((e) => e.key === key)?.name ?? key;

const PROJECTS = [
  { _id: "p1", key: "default", name: "Default Project", tags: [] },
  { _id: "p2", key: "mobile", name: "Mobile Apps", tags: ["ios", "android"] },
  { _id: "p3", key: "web", name: "Web Platform", tags: [] },
];

const SEGMENTS = [
  { key: "beta-testers", name: "Beta Testers", description: "Opted-in beta users" },
  { key: "internal-staff", name: "Internal Staff", description: "Employees" },
];

const ME = {
  _id: "member-me",
  firstName: "Mocky",
  lastName: "McMockFace-1",
  email: "mocky1@example.com",
  role: "reader",
};

const POSSIBLE_VARIATIONS = [
  { value: true, name: "Enabled" },
  { value: false, name: "Disabled" },
  { value: "gray", name: "Gray Variation" },
  { value: "blue", name: "Blue Variation" },
  { value: 123, name: "Numeric Variation" },
];

function createMockFlag(index: number) {
  return {
    key: `flag-${index}`,
    name: `The Coolest Feature Flag #${index}`,
    description: `Mock feature flag #${index}, testing pagination, rules, etc.`,
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: index % 11 === 0,
    temporary: index % 13 === 0,
    kind: "boolean",
    creationDate: Date.now() - index * 100000,
    tags: index % 10 === 0 ? ["test", "mock"] : ["mock"],
    _maintainer: {
      _id: index === 1 ? ME._id : `mock-maintainer-${index}`,
      firstName: "Mocky",
      lastName: `McMockFace-${index}`,
      email: `mocky${index}@example.com`,
    },
    _maintainerTeam: {
      key: `mock-team-${Math.floor(index / 10)}`,
      name: `Mock Team #${Math.floor(index / 10)}`,
    },
    defaults: {
      onVariation: 0,
      offVariation: 1,
    },
    version: index,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        const isOn = index % 3 !== 0;
        const offVariation = 1;
        acc[envKey] = {
          _environmentName: envName(envKey),
          on: isOn,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - index * 5000,
          version: index,
          targets: [],
          rules: [],
          fallthrough: { variation: isOn ? 0 : offVariation },
          offVariation,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  };
}

const allPositiveRulesFlag = {
  key: "test-all-positive-rules",
  name: "All Positive Rules Flag",
  description: "A single flag demonstrating many positive rule scenarios in each environment.",
  variations: POSSIBLE_VARIATIONS,
  archived: false,
  deprecated: false,
  temporary: false,
  kind: "boolean",
  creationDate: Date.now() - 999999,
  tags: ["test", "all-positive", "rules"],
  _maintainer: {
    _id: "all-pos-maintainer",
    firstName: "Positive",
    lastName: "Tester",
    email: "posrules@example.com",
  },
  _maintainerTeam: {
    key: "mock-team-positive",
    name: "Mock Team Positive",
  },
  defaults: {
    onVariation: 0,
    offVariation: 1,
  },
  version: 2000,
  environments: {
    dev: {
      _environmentName: "Development",
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 77777,
      version: 2000,
      targets: [{ values: ["user-1", "user-2"], variation: 0 }],
      contextTargets: [
        { contextKind: "user", values: [], variation: 0 },
        { contextKind: "organization", values: ["acme-corp"], variation: 3 },
      ],
      rules: [
        {
          _id: "rule-segment",
          description: "Beta cohort",
          variation: 2,
          clauses: [{ attribute: "segmentMatch", op: "segmentMatch", values: ["beta-testers"], negate: false }],
          rollout: null,
        },
        {
          variation: 2,
          clauses: [
            {
              attribute: "email",
              op: "in",
              values: ["dev@positive.com", "dev2@positive.com"],
              negate: false,
            },
          ],
          rollout: null,
        },
        {
          variation: undefined,
          clauses: [
            {
              attribute: "region",
              op: "contains",
              values: ["east"],
              negate: false,
            },
          ],
          rollout: {
            variations: [
              { variation: 0, weight: 40000 },
              { variation: 3, weight: 60000 },
            ],
          },
        },
      ],
      fallthrough: { variation: 0 },
      offVariation: 1,
      prerequisites: [],
      variations: POSSIBLE_VARIATIONS,
    },
    qa: {
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 66666,
      version: 2000,
      targets: [{ values: ["qa-tester-123"], variation: 3 }],
      rules: [
        {
          variation: 2,
          clauses: [
            {
              attribute: "email",
              op: "contains",
              values: ["@qa-positive.com"],
              negate: false,
            },
          ],
          rollout: null,
        },
      ],
      fallthrough: { variation: 0 },
      offVariation: 1,
      prerequisites: [],
      variations: POSSIBLE_VARIATIONS,
    },
    staging: {
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 55555,
      version: 2000,
      targets: [],
      rules: [
        {
          variation: 4,
          clauses: [
            {
              attribute: "device",
              op: "in",
              values: ["ios", "android"],
              negate: false,
            },
          ],
          rollout: null,
        },
      ],
      fallthrough: { variation: 0 },
      offVariation: 1,
      prerequisites: [],
      variations: POSSIBLE_VARIATIONS,
    },
    production: {
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 44444,
      version: 2000,
      targets: [],
      rules: [
        {
          variation: undefined,
          clauses: [
            {
              attribute: "company",
              op: "in",
              values: ["PositiveInc"],
              negate: false,
            },
          ],
          rollout: {
            variations: [
              { variation: 0, weight: 30000 },
              { variation: 1, weight: 20000 },
              { variation: 3, weight: 50000 },
            ],
          },
        },
      ],
      fallthrough: { variation: 0 },
      offVariation: 1,
      prerequisites: [],
      variations: POSSIBLE_VARIATIONS,
    },
    demo: {
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 33333,
      version: 2000,
      targets: [],
      rules: [],
      fallthrough: { variation: 2 },
      offVariation: 1,
      prerequisites: [{ key: "test-deprecated", variation: 0 }],
      variations: POSSIBLE_VARIATIONS,
    },
  },
};

const TEST_FLAGS = [
  allPositiveRulesFlag,
  {
    key: "test-archived",
    name: "Archived Flag",
    description: "Tests an archived state.",
    variations: POSSIBLE_VARIATIONS,
    archived: true,
    deprecated: false,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 101000,
    tags: ["test", "archived"],
    _maintainer: {
      _id: "archived-maintainer",
      firstName: "Archy",
      lastName: "Test",
      email: "archived@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-archived",
      name: "Mock Team Archived",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1001,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: false,
          archived: true,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 9999,
          version: 1001,
          targets: [],
          rules: [],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-deprecated",
    name: "Deprecated Flag",
    description: "Tests a deprecated state.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: true,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 202000,
    tags: ["test", "deprecated"],
    _maintainer: {
      _id: "deprecated-maintainer",
      firstName: "Dep",
      lastName: "Test",
      email: "deprecated@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-deprecated",
      name: "Mock Team Deprecated",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1002,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 8888,
          version: 1002,
          targets: [],
          rules: [],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-temporary",
    name: "Temporary Flag",
    description: "Tests a temporary feature flag.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: true,
    kind: "boolean",
    creationDate: Date.now() - 303000,
    tags: ["test", "temporary"],
    _maintainer: {
      _id: "temp-maintainer",
      firstName: "Temp",
      lastName: "Test",
      email: "temp@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-temporary",
      name: "Mock Team Temporary",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1003,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 7777,
          version: 1003,
          targets: [],
          rules: [],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-complex-targeting",
    name: "Complex Targeting Flag",
    description: "Tests advanced rules/targeting logic.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 404000,
    tags: ["test", "rules"],
    _maintainer: {
      _id: "rules-maintainer",
      firstName: "Rules",
      lastName: "Test",
      email: "rules@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-rules",
      name: "Mock Team Rules",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1004,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 6666,
          version: 1004,
          targets: [],
          rules: [
            {
              variation: 2,
              clauses: [{ attribute: "email", op: "in", values: ["test@example.com"], negate: false }],
              rollout: null,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-multi-variation",
    name: "Multi-variation Flag",
    description: "Tests multiple variations and rollouts.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: false,
    kind: "multivariate",
    creationDate: Date.now() - 505000,
    tags: ["test", "multivariate"],
    _maintainer: {
      _id: "multi-maintainer",
      firstName: "Multi",
      lastName: "Test",
      email: "multi@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-multi",
      name: "Mock Team Multi",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1005,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 5555,
          version: 1005,
          targets: [],
          rules: [
            {
              variation: undefined,
              clauses: [{ attribute: "country", op: "in", values: ["US"], negate: false }],
              rollout: {
                variations: [
                  { variation: 0, weight: 50000 },
                  { variation: 2, weight: 50000 },
                ],
              },
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-target-scenario",
    name: "Target Scenario Flag",
    description: "Tests direct user targeting scenario.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 606000,
    tags: ["test", "targets"],
    _maintainer: {
      _id: "target-maintainer",
      firstName: "Target",
      lastName: "Test",
      email: "target@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-target",
      name: "Mock Team Target",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1006,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 4444,
          version: 1006,
          targets: [{ values: ["special-user-1", "special-user-2"], variation: 2 }],
          rules: [],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-rollout-split",
    name: "Rollout Split Flag",
    description: "Tests multiple rollout distributions in rules.",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 707000,
    tags: ["test", "rollout"],
    _maintainer: {
      _id: "rollout-maintainer",
      firstName: "Rollout",
      lastName: "Test",
      email: "rollout@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-rollout",
      name: "Mock Team Rollout",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1007,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        acc[envKey] = {
          on: true,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 3333,
          version: 1007,
          targets: [],
          rules: [
            {
              variation: undefined,
              clauses: [{ attribute: "email", op: "contains", values: ["@rollout.com"], negate: false }],
              rollout: {
                variations: [
                  { variation: 0, weight: 25000 },
                  { variation: 1, weight: 25000 },
                  { variation: 3, weight: 50000 },
                ],
              },
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
  {
    key: "test-env-disabled",
    name: "Env Disabled Flag",
    description: "One environment is turned off (production).",
    variations: POSSIBLE_VARIATIONS,
    archived: false,
    deprecated: false,
    temporary: false,
    kind: "boolean",
    creationDate: Date.now() - 808000,
    tags: ["test", "env-disabled"],
    _maintainer: {
      _id: "env-disabled-maintainer",
      firstName: "Env",
      lastName: "Disabled",
      email: "envdisabled@example.com",
    },
    _maintainerTeam: {
      key: "mock-team-env-disabled",
      name: "Mock Team Env Disabled",
    },
    defaults: { onVariation: 0, offVariation: 1 },
    version: 1008,
    environments: ENV_KEYS.reduce(
      (acc, envKey) => {
        const isOn = envKey === "production" ? false : true;
        acc[envKey] = {
          on: isOn,
          archived: false,
          salt: "random_salt",
          sel: "random_sel",
          lastModified: Date.now() - 2222,
          version: 1008,
          targets: [],
          rules: [],
          fallthrough: { variation: isOn ? 0 : 1 },
          offVariation: 1,
          prerequisites: [],
          variations: POSSIBLE_VARIATIONS,
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  },
];

const autoFlags = Array.from({ length: 60 }, (_, i) => createMockFlag(i + 1));
const MOCK_FLAGS = [...TEST_FLAGS, ...autoFlags];

const app = express();
app.use(cors());

app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  if (Object.keys(req.query).length) {
    console.log(`Query Params: ${JSON.stringify(req.query)}`);
  }
  if (Object.keys(req.body || {}).length) {
    console.log(`Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

/** Unknown project keys 404 like the real API so the extension's error state can be exercised. */
function requireProject(req: Request, res: Response): boolean {
  const projectKey = String(req.params.projectKey);
  if (PROJECTS.some((p) => p.key === projectKey)) return true;
  res.status(404).json({ code: "not_found", message: `Project "${projectKey}" not found` });
  return false;
}

/** Each mock project sees a different slice of the flags so switching projects is visible. */
function flagsForProject(projectKey: string) {
  const index = PROJECTS.findIndex((p) => p.key === projectKey);
  if (index <= 0) return MOCK_FLAGS;
  return MOCK_FLAGS.filter((_, i) => i % PROJECTS.length === index);
}

app.get("/api/v2/flags/:projectKey", (req: Request, res: Response) => {
  if (!requireProject(req, res)) return;
  const { limit = "20", offset = "0", filter } = req.query;
  const intLimit = parseInt(limit as string, 10) || 20;
  const intOffset = parseInt(offset as string, 10) || 0;

  let filteredFlags = flagsForProject(String(req.params.projectKey));

  if (filter) {
    const filterStr = filter.toString().toLowerCase();
    if (filterStr.includes("query:")) {
      const queryText = filterStr.split("query:")[1].split(",")[0].trim();
      filteredFlags = filteredFlags.filter((f) => f.name.toLowerCase().includes(queryText));
    }
    if (filterStr.includes("state:archived")) {
      filteredFlags = filteredFlags.filter((f) => f.archived);
    } else if (filterStr.includes("state:deprecated")) {
      filteredFlags = filteredFlags.filter((f) => f.deprecated);
    } else if (filterStr.includes("state:live")) {
      filteredFlags = filteredFlags.filter((f) => !f.archived && !f.deprecated);
    }

    if (filterStr.includes("type:temporary")) {
      filteredFlags = filteredFlags.filter((f) => f.temporary);
    } else if (filterStr.includes("type:permanent")) {
      filteredFlags = filteredFlags.filter((f) => !f.temporary);
    }
    const maintainerMatch = /maintainerid:([^,]+)/.exec(filterStr);
    if (maintainerMatch) {
      filteredFlags = filteredFlags.filter((f) => f._maintainer._id.toLowerCase() === maintainerMatch[1]);
    }
    const tagsMatch = /tags:([^,]+)/.exec(filterStr);
    if (tagsMatch) {
      const wanted = tagsMatch[1].split("+");
      filteredFlags = filteredFlags.filter((f) => wanted.every((t) => f.tags.includes(t)));
    }
  }

  // API version 20240415 omits `environments` from the list endpoint unless
  // `filterEnv` is used; mirror that so the extension exercises the detail fetch.
  const listFlags = filteredFlags.map((f) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { environments, ...rest } = f;
    return rest;
  });

  const paged = listFlags.slice(intOffset, intOffset + intLimit);
  const nextOffset = intOffset + intLimit;
  const links: Record<string, { href: string; type: string }> = {
    self: { href: req.originalUrl, type: "application/json" },
  };
  if (nextOffset < filteredFlags.length) {
    const next = new URL(req.originalUrl, "http://localhost");
    next.searchParams.set("offset", String(nextOffset));
    links.next = { href: next.pathname + next.search, type: "application/json" };
  }

  res.json({
    items: paged,
    totalCount: filteredFlags.length,
    _links: links,
  });
});

// Paginated like the real endpoint so `_links.next` handling is exercised;
// pass a small `limit` (e.g. 1) to see the picker stitch pages together.
app.get("/api/v2/projects", (req: Request, res: Response) => {
  const limit = Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20);
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
  const items = PROJECTS.slice(offset, offset + limit);
  const links: Record<string, { href: string; type: string }> = {
    self: { href: req.originalUrl, type: "application/json" },
  };
  if (offset + limit < PROJECTS.length) {
    const next = new URL(req.originalUrl, "http://localhost");
    next.searchParams.set("offset", String(offset + limit));
    links.next = { href: next.pathname + next.search, type: "application/json" };
  }
  res.json({ items, totalCount: PROJECTS.length, _links: links });
});

app.get("/api/v2/projects/:projectKey/environments", (req: Request, res: Response) => {
  if (!requireProject(req, res)) return;
  const items = ENVIRONMENTS.map((e) => ({ ...e, _id: `env-${e.key}`, tags: [] }));
  console.log(`Project: ${req.params.projectKey}, returning ${items.length} environments`);
  res.json({ items, totalCount: items.length, _links: {} });
});

app.get("/api/v2/flag-status/:projectKey/:flagKey", (req: Request, res: Response) => {
  const { flagKey } = req.params;
  const found = MOCK_FLAGS.find((f) => f.key === flagKey);
  if (!found) {
    res.status(404).json({ code: "not_found", message: "Flag not found" });
    return;
  }
  const names = ["active", "inactive", "new", "launched"];
  const environments = ENV_KEYS.reduce(
    (acc, envKey, i) => {
      const name = names[(flagKey.length + i) % names.length];
      acc[envKey] = {
        name,
        lastRequested: name === "new" ? undefined : new Date(Date.now() - (i + 1) * 3600_000 * 5).toISOString(),
        default: false,
      };
      return acc;
    },
    {} as Record<string, any>,
  );
  res.json({ key: flagKey, environments, _links: {} });
});

app.get("/api/v2/tags", (req: Request, res: Response) => {
  const tags = [...new Set(MOCK_FLAGS.flatMap((f) => f.tags))].sort();
  console.log(`Tags kind=${req.query.kind}: ${tags.length}`);
  res.json({ items: tags, totalCount: tags.length, _links: {} });
});

app.get("/api/v2/segments/:projectKey/:environmentKey", (_req: Request, res: Response) => {
  res.json({ items: SEGMENTS, totalCount: SEGMENTS.length, _links: {} });
});

app.get("/api/v2/members/me", (_req: Request, res: Response) => {
  res.json(ME);
});

const AUDIT_VERBS = [
  "turned on the flag",
  "turned off the flag",
  "changed the fallthrough variation for the flag",
  "added a rule to the flag",
  "updated the description of the flag",
];

const AUDIT_LOG = Array.from({ length: 65 }, (_, i) => {
  const flag = MOCK_FLAGS[i % MOCK_FLAGS.length];
  const envKey = ENV_KEYS[i % ENV_KEYS.length];
  const verb = AUDIT_VERBS[i % AUDIT_VERBS.length];
  const member =
    i % 4 === 0 ? ME : { _id: `m-${i}`, firstName: "Auditor", lastName: `#${i}`, email: `auditor${i}@example.com` };
  return {
    _id: `audit-${i}`,
    _accountId: "acct",
    date: Date.now() - i * 37 * 60_000,
    kind: "flag",
    name: flag.name,
    title: `${member.firstName} ${member.lastName} ${verb} [${flag.name}](/flags/${flag.key}) in \`${envName(envKey)}\``,
    titleVerb: verb,
    description: `${verb} **${flag.name}** in ${envName(envKey)}.\n\n- before: \`false\`\n- after: \`true\``,
    shortDescription: "",
    comment: i % 3 === 0 ? "Rolling out to the beta cohort first." : "",
    member,
    target: {
      name: flag.name,
      resources: [`proj/default:env/${envKey}:flag/${flag.key}`],
    },
    parent: { name: "Default Project", resource: "proj/default" },
  };
});

app.get("/api/v2/auditlog", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "10"), 10) || 10, 20);
  const before = req.query.before ? parseInt(String(req.query.before), 10) : undefined;
  const spec = String(req.query.spec ?? "");
  const projMatch = /^proj\/([^:]+)/.exec(spec);
  const flagMatch = /:flag\/([^:]+)/.exec(spec);
  const envMatch = /:env\/([^:]+)/.exec(spec);

  const projectKey = projMatch?.[1] ?? "default";
  const projectFlagKeys = new Set(flagsForProject(projectKey).map((f) => f.key));
  let entries = AUDIT_LOG.filter((e) => projectFlagKeys.has(e.target.resources[0].split(":flag/")[1]));
  if (flagMatch && flagMatch[1] !== "*")
    entries = entries.filter((e) => e.target.resources[0].endsWith(`:flag/${flagMatch[1]}`));
  if (envMatch && envMatch[1] !== "*")
    entries = entries.filter((e) => e.target.resources[0].includes(`:env/${envMatch[1]}:`));
  if (before) entries = entries.filter((e) => e.date < before);

  res.json({ items: entries.slice(0, limit), _links: {} });
});

app.get("/api/v2/flags/:projectKey/:flagKey", (req: Request, res: Response) => {
  if (!requireProject(req, res)) return;
  const { projectKey, flagKey } = req.params;
  const found = flagsForProject(String(projectKey)).find((f) => f.key === flagKey);
  if (!found) {
    res.status(404).json({ code: "not_found", message: "Flag not found" });
    return;
  }
  console.log(`Project: ${projectKey}, returning single flag: ${found.key}`);
  res.json(found);
});

// Browser pages the extension deep-links to; plain HTML echoing the parameters.
// Everything that came from the URL is escaped before it reaches the markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Normalise an Express param/query value (string | string[] | undefined) to a display string. */
function queryText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return value === undefined ? "" : String(value);
}

function mockPage(title: string, rows: Record<string, string | undefined>): string {
  const items = Object.entries(rows)
    .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v || "(none)")}</p>`)
    .join("\n  ");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${escapeHtml(title)}</title></head>
<body><h1>${escapeHtml(title)}</h1>
  ${items}
  <hr><p><em>This is a mock LaunchDarkly page.</em></p></body></html>`;
}

app.get("/projects/:projectKey/flags", (req: Request, res: Response) => {
  res.send(mockPage("Mock LaunchDarkly Project Flags", { "Project Key": queryText(req.params.projectKey) }));
});

app.get("/settings/history", (req: Request, res: Response) => {
  res.send(mockPage("Mock LaunchDarkly History", { spec: queryText(req.query.spec) }));
});

app.get("/projects/:projectKey/flags/:flagKey/targeting", (req: Request, res: Response) => {
  res.send(
    mockPage("Mock LaunchDarkly Flag Targeting", {
      "Project Key": queryText(req.params.projectKey),
      "Flag Key": queryText(req.params.flagKey),
      "env query params": queryText(req.query.env),
      "selected-env": queryText(req.query["selected-env"]),
    }),
  );
});

// Development-only server: bind to loopback so it is never reachable from other hosts.
const PORT = 4000;
const HOST = "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`Mock LD server listening on http://${HOST}:${PORT}`);
});
