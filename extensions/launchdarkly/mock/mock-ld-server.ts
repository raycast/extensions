import express, { Request, Response } from "express";
import cors from "cors";

const ENV_KEYS = ["dev", "qa", "staging", "production", "demo"];

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
      _id: `mock-maintainer-${index}`,
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
      const isOn = index % 3 !== 0;
      const offVariation = 1;
      acc[envKey] = {
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
    }, {} as Record<string, any>),
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
      on: true,
      archived: false,
      salt: "random_salt",
      sel: "random_sel",
      lastModified: Date.now() - 77777,
      version: 2000,
      targets: [],
      rules: [
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
      prerequisites: [
        { key: "test-deprecated", variation: 0 },
      ],
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
            clauses: [
              { attribute: "email", op: "in", values: ["test@example.com"], negate: false },
            ],
            rollout: null,
          },
        ],
        fallthrough: { variation: 0 },
        offVariation: 1,
        prerequisites: [],
        variations: POSSIBLE_VARIATIONS,
      };
      return acc;
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
      acc[envKey] = {
        on: true,
        archived: false,
        salt: "random_salt",
        sel: "random_sel",
        lastModified: Date.now() - 4444,
        version: 1006,
        targets: [
          { values: ["special-user-1", "special-user-2"], variation: 2 },
        ],
        rules: [],
        fallthrough: { variation: 0 },
        offVariation: 1,
        prerequisites: [],
        variations: POSSIBLE_VARIATIONS,
      };
      return acc;
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
            clauses: [
              { attribute: "email", op: "contains", values: ["@rollout.com"], negate: false },
            ],
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
    }, {} as Record<string, any>),
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
    environments: ENV_KEYS.reduce((acc, envKey) => {
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
    }, {} as Record<string, any>),
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

app.get("/api/v2/flags/:projectKey", (req: Request, res: Response) => {
  const { limit = "20", offset = "0", filter } = req.query;
  const intLimit = parseInt(limit as string, 10) || 20;
  const intOffset = parseInt(offset as string, 10) || 0;

  let filteredFlags = [...MOCK_FLAGS];

  if (filter) {
    const filterStr = filter.toString().toLowerCase();
    if (filterStr.includes("query:")) {
      const queryText = filterStr.split("query:")[1].split(",")[0].trim();
      filteredFlags = filteredFlags.filter((f) =>
        f.name.toLowerCase().includes(queryText)
      );
    }
    if (filterStr.includes("state:archived")) {
      filteredFlags = filteredFlags.filter((f) => f.archived);
    } else if (filterStr.includes("state:deprecated")) {
      filteredFlags = filteredFlags.filter((f) => f.deprecated);
    } else if (filterStr.includes("state:live")) {
      filteredFlags = filteredFlags.filter((f) => !f.archived && !f.deprecated);
    }
    
    // remove enviroments from the flags
    filteredFlags = filteredFlags.map((f) => {
      const { environments, ...rest } = f;
      return { ...rest, environments: {} };
    });
  }

  const paged = filteredFlags.slice(intOffset, intOffset + intLimit);

  res.json({
    items: paged,
    totalCount: filteredFlags.length,
  });
});

app.get("/api/v2/flags/:projectKey/:flagKey", (req: Request, res: Response) => {
  const { projectKey, flagKey } = req.params;
  const found = MOCK_FLAGS.find((f) => f.key === flagKey);
  if (!found) {
    res.status(404).json({ error: "Flag not found" });
    return;
  }
  console.log(`Project: ${projectKey}, returning single flag: ${found.key}`);
  res.json(found);
});

app.get("/projects/:projectKey/flags/:flagKey/targeting", (req: Request, res: Response) => {
  const { projectKey, flagKey } = req.params;
  const envParam = req.query.env; 
  let envs: string[] = [];
  if (typeof envParam === "string") {
    envs = [envParam];
  } else if (Array.isArray(envParam)) {
    envs = envParam.map((v) => String(v));
  }
  const selectedEnvParam = req.query["selected-env"];
  let selectedEnv = "";
  if (typeof selectedEnvParam === "string") {
    selectedEnv = selectedEnvParam;
  } else if (Array.isArray(selectedEnvParam) && selectedEnvParam.length > 0) {
    selectedEnv = String(selectedEnvParam[0]);
  }
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mock LaunchDarkly Flag Targeting</title>
</head>
<body>
  <h1>Mock LaunchDarkly Flag Targeting Page</h1>
  <p><strong>Project Key:</strong> ${projectKey}</p>
  <p><strong>Flag Key:</strong> ${flagKey}</p>
  <p><strong>env query params:</strong> ${envs.join(", ") || "(none)"} </p>
  <p><strong>selected-env:</strong> ${selectedEnv || "(none)"} </p>
  <hr>
  <p><em>This is a mock page. Your extension is hitting /projects/:projectKey/flags/:flagKey/targeting</em></p>
</body>
</html>
`;
  res.status(200).send(html);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Mock LD server listening on http://localhost:${PORT}`);
});
