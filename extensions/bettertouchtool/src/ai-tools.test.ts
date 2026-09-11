import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActionJson, TriggerJson } from "bettertouchtool";
import type { ActionDefinition } from "bettertouchtool/catalog";
import {
  getVariable,
  parseActionParameterInputs,
  parseVariableValue,
  runAction,
  runNamedTrigger,
  searchActions,
  searchNamedTriggers,
  setVariable,
  type BttAiClient,
} from "./ai-tools";

describe("AI named trigger tools", () => {
  it("filters by state, ranks names, and resolves nested group paths", async () => {
    const btt = new FakeBttClient();
    btt.triggers = [
      namedTrigger("deploy", "Deploy Workspace", true, "child", "Run Shell Script"),
      namedTrigger("disabled", "Deploy Old Workspace", false, "child"),
      namedTrigger("unrelated", "Open Notes", true),
    ];
    btt.groups = [
      { BTTUUID: "parent", BTTGroupName: "Development" },
      { BTTUUID: "child", BTTGroupName: "Workspaces", BTTTriggerParentUUID: "parent" },
    ];

    const result = await searchNamedTriggers(btt, { query: "deploy", status: "enabled" });

    assert.deepEqual(result, {
      success: true,
      triggers: [
        {
          uuid: "deploy",
          name: "Deploy Workspace",
          enabled: true,
          group: "Development › Workspaces",
          actions: ["Run Shell Script"],
        },
      ],
    });
  });

  it("can find a trigger by its group or assigned action and tolerates missing group metadata", async () => {
    const btt = new FakeBttClient();
    btt.triggers = [namedTrigger("deploy", "Deploy Workspace", true, "missing", "Run Shell Script")];
    btt.failGroups = true;

    const result = await searchNamedTriggers(btt, { query: "shell script" });

    assert.equal(result.success, true);
    assert.deepEqual(result.success && result.triggers.map((trigger) => trigger.uuid), ["deploy"]);
  });

  it("refuses disabled triggers and invokes enabled triggers by their fetched UUID", async () => {
    const btt = new FakeBttClient();
    btt.triggers = [namedTrigger("enabled", "Run Me", true), namedTrigger("disabled", "Not Me", false)];
    btt.invokeResults.set("enabled", "done");

    assert.deepEqual(await runNamedTrigger(btt, "disabled"), {
      success: false,
      error: "The named trigger “Not Me” is disabled.",
    });
    assert.deepEqual(await runNamedTrigger(btt, "enabled"), {
      success: true,
      trigger: { uuid: "enabled", name: "Run Me" },
      result: "done",
    });
    assert.deepEqual(btt.invokedTriggers, ["enabled"]);
  });
});

describe("AI action tools", () => {
  const catalog = [
    actionDefinition(13, "Sleep Display", "sleepDisplay", "System Actions", "Puts the display to sleep."),
    actionDefinition(20, "Launch Application", "launchApplication", "Application Control", "Opens an app.", [
      { key: "BTTLaunchPath", description: "Application path" },
      { key: "BTTDelay", description: "Delay in seconds" },
    ]),
  ];

  it("ranks catalog matches and returns parameter documentation", () => {
    assert.deepEqual(searchActions({ query: "Launch Application" }, catalog), {
      success: true,
      actions: [
        {
          id: 20,
          name: "Launch Application",
          category: "Application Control",
          description: "Opens an app.",
          parameters: [
            {
              name: "BTTLaunchPath",
              description: "Application path",
              type: "text",
              example: "/Applications/Safari.app",
            },
            { name: "BTTDelay", description: "Delay in seconds", type: "number" },
          ],
        },
      ],
    });
  });

  it("supports close typo matches without returning unrelated actions", () => {
    const result = searchActions({ query: "Sleep Disply" }, catalog);
    assert.equal(result.success, true);
    assert.deepEqual(result.success && result.actions.map((action) => action.id), [13]);
  });

  it("validates the selected action and parameters before execution", async () => {
    const btt = new FakeBttClient();

    assert.deepEqual(await runAction(btt, { id: 999 }, catalog), {
      success: false,
      error: "No BetterTouchTool action exists with ID 999.",
    });
    assert.deepEqual(await runAction(btt, { id: 20, parameters: { InventedKey: "value" } }, catalog), {
      success: false,
      error: "“InventedKey” is not a supported parameter for the “Launch Application” action.",
    });
    assert.deepEqual(await runAction(btt, { id: 20, parameters: { BTTDelay: "soon" } }, catalog), {
      success: false,
      error: "“BTTDelay” must be a finite number.",
    });
    assert.equal(btt.executedActions.length, 0);
  });

  it("parses schema-friendly action parameter inputs using catalog types", () => {
    assert.deepEqual(
      parseActionParameterInputs(
        20,
        [
          { name: "BTTLaunchPath", value: "/Applications/Safari.app" },
          { name: "BTTDelay", value: "0.5" },
        ],
        catalog,
      ),
      {
        success: true,
        parameters: { BTTLaunchPath: "/Applications/Safari.app", BTTDelay: 0.5 },
      },
    );
    assert.equal(parseActionParameterInputs(20, [{ name: "BTTDelay", value: "soon" }], catalog).success, false);
  });

  it("builds and executes the catalog action with validated parameters", async () => {
    const btt = new FakeBttClient();
    btt.actionResult = "launched";

    const result = await runAction(
      btt,
      { id: 20, parameters: { BTTLaunchPath: "/Applications/Safari.app", BTTDelay: 0.5 } },
      catalog,
    );

    assert.deepEqual(result, {
      success: true,
      action: { id: 20, name: "Launch Application" },
      result: "launched",
    });
    assert.deepEqual(btt.executedActions, [
      {
        BTTPredefinedActionType: 20,
        BTTLaunchPath: "/Applications/Safari.app",
        BTTDelay: 0.5,
      },
    ]);
  });
});

describe("AI variable tools", () => {
  it("reports exact names, values, types, and unset state", async () => {
    const btt = new FakeBttClient();
    btt.variables.set("Build_Label", "001-Alpha");
    btt.variableTypes.set("Build_Label", "string");

    assert.deepEqual(await getVariable(btt, "Build_Label"), {
      success: true,
      variable: { name: "Build_Label", value: "001-Alpha", type: "string", isSet: true },
    });
    assert.deepEqual(await getVariable(btt, "Missing"), {
      success: true,
      variable: { name: "Missing", value: "", type: "string", isSet: false },
    });
  });

  it("preserves strings verbatim and strictly parses finite numbers", () => {
    assert.deepEqual(parseVariableValue(" 001-Alpha ", "string"), { success: true, value: " 001-Alpha " });
    assert.deepEqual(parseVariableValue("3.5", "number"), { success: true, value: 3.5 });
    assert.equal(parseVariableValue("", "number").success, false);
    assert.equal(parseVariableValue("Infinity", "number").success, false);
  });

  it("sets the requested type and persistence without rewriting the variable name", async () => {
    const btt = new FakeBttClient();

    assert.deepEqual(
      await setVariable(btt, {
        variableName: " Build_Label ",
        variableValue: "001-Alpha",
        variableType: "string",
        persistent: true,
      }),
      {
        success: true,
        variable: {
          name: " Build_Label ",
          value: "001-Alpha",
          type: "string",
          persistent: true,
        },
      },
    );
    assert.deepEqual(btt.variableWrites, [{ name: " Build_Label ", value: "001-Alpha", persistent: true }]);
  });
});

class FakeBttClient implements BttAiClient {
  triggers: TriggerJson[] = [];
  groups: TriggerJson[] = [];
  failGroups = false;
  invokeResults = new Map<string, string>();
  invokedTriggers: string[] = [];
  actionResult = "";
  executedActions: Array<ActionJson | ActionJson[]> = [];
  variables = new Map<string, string | number>();
  variableTypes = new Map<string, string>();
  variableWrites: Array<{ name: string; value: string | number; persistent: boolean }> = [];

  vars = {
    get: async (name: string) => this.variables.get(name) ?? "",
    set: async (name: string, value: string | number, options?: { persistent?: boolean }) => {
      this.variableWrites.push({ name, value, persistent: options?.persistent ?? false });
      this.variables.set(name, value);
    },
  };

  async getTriggers<T extends TriggerJson = TriggerJson>(filter?: { triggerId?: number }): Promise<T[]> {
    if (filter?.triggerId === 630 && this.failGroups) throw new Error("Groups unavailable");
    return (filter?.triggerId === 630 ? this.groups : this.triggers) as T[];
  }

  async getTrigger<T extends TriggerJson = TriggerJson>(uuid: string): Promise<T> {
    const trigger = this.triggers.find((candidate) => candidate.BTTUUID === uuid);
    if (!trigger) throw new Error(`Missing trigger ${uuid}`);
    return trigger as T;
  }

  trigger(uuid: string) {
    return {
      invoke: async () => {
        this.invokedTriggers.push(uuid);
        return this.invokeResults.get(uuid) ?? "";
      },
    };
  }

  async triggerAction(action: ActionJson | ActionJson[]) {
    this.executedActions.push(action);
    return this.actionResult;
  }

  async getVariableType(name: string) {
    return this.variableTypes.get(name) ?? "";
  }
}

function namedTrigger(
  uuid: string,
  name: string,
  enabled: boolean,
  parentUuid?: string,
  actionName?: string,
): TriggerJson {
  return {
    BTTUUID: uuid,
    BTTTriggerName: name,
    BTTEnabled: enabled ? 1 : 0,
    BTTEnabled2: enabled ? 1 : 0,
    ...(parentUuid ? { BTTTriggerParentUUID: parentUuid } : {}),
    ...(actionName
      ? { BTTActionsToExecute: [{ BTTPredefinedActionType: 0, BTTPredefinedActionName: actionName }] }
      : {}),
  };
}

function actionDefinition(
  id: number,
  name: string,
  slug: string,
  category: string,
  description: string,
  params: ActionDefinition["params"] = [],
): ActionDefinition {
  return {
    id,
    name,
    slug,
    category,
    description,
    params: [{ key: "BTTPredefinedActionType", description: "Action type" }, ...params],
    example:
      id === 20
        ? { BTTPredefinedActionType: id, BTTLaunchPath: "/Applications/Safari.app" }
        : { BTTPredefinedActionType: id },
  };
}
