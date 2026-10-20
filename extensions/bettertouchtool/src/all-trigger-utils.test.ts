import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TriggerJson } from "bettertouchtool";
import type { TriggerDefinition } from "bettertouchtool/catalog";
import {
  getConfiguredTriggers,
  getTriggerGroupPaths,
  getTriggerListMetadata,
  getTriggerParentGroupPath,
} from "./all-trigger-utils";

const catalog: TriggerDefinition[] = [
  {
    id: 643,
    name: "Named Trigger",
    slug: "namedTrigger",
    category: "Other Triggers / Automations",
    triggerClass: "BTTTriggerTypeOtherTriggers",
  },
  {
    id: 0,
    name: "Keyboard Shortcut",
    slug: "keyboardShortcut",
    category: "Keyboard Shortcuts",
    triggerClass: "BTTTriggerTypeKeyboardShortcut",
  },
];

describe("configured BTT triggers", () => {
  it("removes flattened action records and malformed items", () => {
    const triggers: TriggerJson[] = [
      { BTTUUID: "named", BTTTriggerClass: "BTTTriggerTypeOtherTriggers", BTTTriggerType: 643 },
      { BTTUUID: "action", BTTIsPureAction: true, BTTPredefinedActionType: 49 },
      { BTTTriggerClass: "BTTTriggerTypeOtherTriggers", BTTTriggerType: 643 },
    ];

    assert.deepEqual(
      getConfiguredTriggers(triggers).map((trigger) => trigger.BTTUUID),
      ["named"],
    );
  });

  it("derives searchable titles, types, categories, and action summaries", () => {
    const [trigger] = getConfiguredTriggers([
      {
        BTTUUID: "named",
        BTTTriggerClass: "BTTTriggerTypeOtherTriggers",
        BTTTriggerType: 643,
        BTTTriggerName: "Deploy Workspace",
        BTTPredefinedActionName: "Run Shell Script",
      },
    ]);

    assert.deepEqual(getTriggerListMetadata(trigger, catalog), {
      title: "Deploy Workspace",
      typeName: "Named Trigger",
      category: "Other Triggers / Automations",
      subtitle: "Named Trigger · Run Shell Script",
    });
  });

  it("falls back to a readable trigger class for uncatalogued trigger types", () => {
    const [trigger] = getConfiguredTriggers([
      { BTTUUID: "ai", BTTTriggerClass: "BTTTriggerTypeHalloAI", BTTGestureNotes: "Ask Assistant" },
    ]);

    assert.deepEqual(getTriggerListMetadata(trigger, catalog), {
      title: "Ask Assistant",
      typeName: "Hallo AI",
      category: "Hallo AI",
      subtitle: "Hallo AI",
    });
  });
});

describe("BTT trigger group paths", () => {
  it("resolves nested group paths and the parent path for a trigger", () => {
    const triggers = getConfiguredTriggers([
      {
        BTTUUID: "parent",
        BTTTriggerClass: "BTTTriggerTypeOtherTriggers",
        BTTGroupName: "Development",
      },
      {
        BTTUUID: "child",
        BTTTriggerClass: "BTTTriggerTypeOtherTriggers",
        BTTGroupName: "Deployments",
        BTTTriggerParentUUID: "parent",
      },
      {
        BTTUUID: "trigger",
        BTTTriggerClass: "BTTTriggerTypeOtherTriggers",
        BTTTriggerName: "Ship",
        BTTTriggerParentUUID: "child",
      },
    ]);
    const paths = getTriggerGroupPaths(triggers);

    assert.equal(paths.get("child"), "Development › Deployments");
    assert.equal(getTriggerParentGroupPath(triggers[2], paths), "Development › Deployments");
  });
});
