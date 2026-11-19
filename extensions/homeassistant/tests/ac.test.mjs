import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as climateUtils from "../src/components/climate/utils.ts";
const { climateOptions, climateTemperature, climateTemperatures, isAirConditioner, isClimateAvailable } = climateUtils;

function loadModuleWithMocks(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  const require = createRequire(import.meta.url);
  runInNewContext(outputText, { exports, require: (name) => mocks[name] ?? require(name) });
  return exports;
}

test("AC discovery excludes heating-only entities and unrelated domains", () => {
  const ac = { entity_id: "climate.office", state: "off", attributes: { hvac_modes: ["off", "cool", "heat"] } };
  assert.equal(isAirConditioner(ac), true);
  assert.equal(isAirConditioner({ ...ac, entity_id: "fan.office" }), false);
  assert.equal(isAirConditioner({ ...ac, attributes: { hvac_modes: ["off", "heat"] } }), false);
  assert.equal(isAirConditioner({ ...ac, attributes: {} }), false);
  assert.deepEqual(climateOptions("cool"), []);
  assert.equal(isClimateAvailable({ ...ac, state: "unavailable" }), false);
  assert.equal(isClimateAvailable({ ...ac, state: "unknown" }), false);
  assert.equal(isClimateAvailable(ac), true);
});

test("temperature choices respect device bounds, fractional steps and capabilities", () => {
  const state = {
    state: "cool",
    attributes: { min_temp: 16, max_temp: 18, temperature: 17, target_temp_step: 0.5, supported_features: 1 },
  };
  assert.deepEqual(climateTemperatures(state), [16, 16.5, 17, 17.5, 18]);
  assert.deepEqual(
    climateTemperatures({ ...state, attributes: { ...state.attributes, min_temp: 16.2, max_temp: 17.3 } }),
    [16.2, 16.7, 17.2],
  );
  for (const attributes of [
    { target_temp_step: 0 },
    { min_temp: null },
    { min_temp: 20 },
    { max_temp: Infinity },
    { supported_features: 0 },
    { temperature: null },
  ]) {
    assert.deepEqual(climateTemperatures({ ...state, attributes: { ...state.attributes, ...attributes } }), []);
  }
  assert.deepEqual(climateTemperatures({ ...state, state: "heat_cool" }), []);
  assert.deepEqual(
    climateTemperatures({ ...state, state: "auto", attributes: { ...state.attributes, temperature: null } }),
    [],
  );
  assert.deepEqual(
    climateTemperatures({ ...state, attributes: { ...state.attributes, target_temp_step: undefined } }),
    [16, 16.5, 17, 17.5, 18],
  );
  assert.deepEqual(
    climateTemperatures({
      ...state,
      attributes: { ...state.attributes, target_temp_step: undefined, temperature_unit: "°F" },
    }),
    [16, 17, 18],
  );
  assert.equal(climateTemperature({ attributes: { temperature_unit: "°F" } }, 72), "72°F");
  assert.equal(climateTemperature(state, 0), "0°");
  assert.equal(climateTemperature(state, null), "Not reported");
});

test("temperature choices reject excessive counts and overflow before allocation", () => {
  const state = {
    state: "cool",
    attributes: { min_temp: 0, max_temp: 999, temperature: 20, target_temp_step: 1, supported_features: 1 },
  };
  const temperatures = climateTemperatures(state);
  assert.equal(temperatures.length, 1000);
  assert.equal(temperatures[0], 0);
  assert.equal(temperatures.at(-1), 999);
  for (const attributes of [
    { max_temp: 1000 },
    { min_temp: 16, max_temp: 18, target_temp_step: 0.001 },
    { target_temp_step: Number.MIN_VALUE },
    { min_temp: -Number.MAX_VALUE, max_temp: Number.MAX_VALUE },
  ]) {
    assert.equal(climateTemperatures({ ...state, attributes: { ...state.attributes, ...attributes } }).length, 0);
  }
});

test("visibility toggle refreshes the menu in background and rolls back failures", async () => {
  const values = new Map();
  const launches = [];
  let fail = false;
  const { default: toggle } = loadModuleWithMocks("../src/toggle-ac-menu.ts", {
    "@lib/ac-menu": { acMenuCache: values },
    "@lib/utils": { getErrorMessage: String },
    "@raycast/api": {
      LaunchType: { Background: "background" },
      launchCommand: async (options) => {
        if (fail) throw new Error("Disabled command");
        launches.push(options.type);
      },
      showHUD: async () => {},
    },
  });
  await toggle();
  assert.equal(values.get("visible"), "true");
  await toggle();
  assert.equal(values.get("visible"), "false");
  assert.deepEqual(launches, ["background", "background"]);
  fail = true;
  await toggle();
  assert.equal(values.get("visible"), "false");
});

test("AC controls refresh the selected entity after commands and distinguish refresh failures", async () => {
  const calls = [];
  const messages = [];
  let fail = false;
  let failRefresh = false;
  let refreshes = 0;
  const { ACControls } = loadModuleWithMocks("../src/components/climate/menu.tsx", {
    "@components/menu": { MenuBarSubmenu: "Submenu" },
    "@lib/common": {
      ha: {
        post: async (service, data) => {
          if (fail) throw new Error("Connection failed");
          calls.push([service, { ...data }]);
          if (failRefresh && service === "services/homeassistant/update_entity") throw new Error("Refresh failed");
        },
      },
    },
    "@lib/utils": { getErrorMessage: String },
    "./utils": climateUtils,
    "@raycast/api": {
      Icon: {},
      MenuBarExtra: { Item: "Item", Section: "Section" },
      LaunchType: { Background: "background" },
      launchCommand: async () => {
        refreshes++;
      },
      showHUD: async (message) => {
        messages.push(message);
      },
    },
  });
  const state = { entity_id: "climate.office", state: "off", attributes: { hvac_modes: ["off", "cool"] } };
  assert.equal(ACControls({ state, available: false }), null);
  const controls = ACControls({ state, available: true });
  const power = controls.props.children[0];
  await power.props.onAction();
  assert.deepEqual(calls, [
    ["services/climate/set_hvac_mode", { entity_id: "climate.office", hvac_mode: "cool" }],
    ["services/homeassistant/update_entity", { entity_id: "climate.office" }],
  ]);
  assert.equal(refreshes, 1);
  const turnOff = ACControls({ state: { ...state, state: "cool" }, available: true }).props.children[0];
  calls.length = 0;
  await turnOff.props.onAction();
  assert.deepEqual(calls, [
    ["services/climate/set_hvac_mode", { entity_id: "climate.office", hvac_mode: "off" }],
    ["services/homeassistant/update_entity", { entity_id: "climate.office" }],
  ]);
  assert.equal(refreshes, 2);
  const activeState = {
    ...state,
    state: "cool",
    attributes: {
      hvac_modes: ["off", "cool", "fan_only"],
      min_temp: 16,
      max_temp: 18,
      temperature: 17,
      target_temp_step: 0.5,
      supported_features: 1,
      fan_modes: ["auto", "high"],
      swing_modes: ["off", "vertical"],
      swing_horizontal_modes: ["off", "left_right"],
      preset_modes: ["none", "eco_mode"],
    },
  };
  const [, temperatureMenu, optionMenus] = ACControls({ state: activeState, available: true }).props.children;
  const [warmer, cooler, temperatureChoices] = temperatureMenu.props.children;
  const actions = [
    [warmer, "set_temperature", { temperature: 17.5 }],
    [cooler, "set_temperature", { temperature: 16.5 }],
    [temperatureChoices.props.children.at(-1), "set_temperature", { temperature: 18 }],
  ];
  for (const [title, option, service, data] of [
    ["Mode", "Fan only", "set_hvac_mode", { hvac_mode: "fan_only" }],
    ["Fan", "High", "set_fan_mode", { fan_mode: "high" }],
    ["Swing", "Vertical", "set_swing_mode", { swing_mode: "vertical" }],
    ["Horizontal Swing", "Left right", "set_swing_horizontal_mode", { swing_horizontal_mode: "left_right" }],
    ["Preset", "Eco mode", "set_preset_mode", { preset_mode: "eco_mode" }],
  ]) {
    const menu = optionMenus.find((item) => item.props.title === title);
    actions.push([menu.props.children.find((item) => item.props.title === option), service, data]);
  }
  for (const [action, service, data] of actions) {
    calls.length = 0;
    const previousRefreshes = refreshes;
    await action.props.onAction();
    assert.deepEqual(calls, [
      [`services/climate/${service}`, { entity_id: "climate.office", ...data }],
      ["services/homeassistant/update_entity", { entity_id: "climate.office" }],
    ]);
    assert.equal(refreshes, previousRefreshes + 1);
  }
  const successfulRefreshes = refreshes;
  fail = true;
  calls.length = 0;
  await power.props.onAction();
  assert.deepEqual(calls, []);
  assert.equal(refreshes, successfulRefreshes);
  assert.match(messages[0], /AC control failed/);
  fail = false;
  failRefresh = true;
  await turnOff.props.onAction();
  assert.equal(refreshes, successfulRefreshes);
  assert.match(messages[1], /AC command sent.*status refresh failed/);
});

test("Refresh updates only displayed ACs before reloading and reports failures", async () => {
  const events = [];
  let fail = false;
  let states = [
    { entity_id: "climate.office", state: "off", attributes: { hvac_modes: ["off", "cool"] } },
    { entity_id: "climate.bedroom", state: "cool", attributes: { hvac_modes: ["off", "cool"] } },
    { entity_id: "climate.heater", state: "heat", attributes: { hvac_modes: ["off", "heat"] } },
  ];
  const { default: Command } = loadModuleWithMocks("../src/acmenu.tsx", {
    "@components/hooks": { useVisibleHAStates: () => ({ states, isLoading: false }) },
    "@components/menu": { MenuBarSubmenu: "Submenu" },
    "@components/climate/menu": { ACControls: "Controls" },
    "@components/climate/utils": climateUtils,
    "@lib/ac-menu": { acMenuCache: new Map([["visible", "true"]]) },
    "@lib/common": {
      ha: {
        post: async (service, data) => {
          events.push([service, ...data.entity_id]);
          if (fail) throw new Error("Connection failed");
        },
      },
    },
    "@lib/entity-overrides": { useEntityOverrides: () => ({ entityAliases: {} }) },
    "@lib/utils": { getDisplayName: (state) => state.entity_id, getErrorMessage: String },
    "@raycast-community/ui": { MenuBarExtra: { ConfigureCommand: "Configure" } },
    "@raycast/api": {
      Color: {},
      Icon: {},
      environment: { launchType: "background" },
      LaunchType: { Background: "background", UserInitiated: "user" },
      MenuBarExtra: { Item: "Item", Section: "Section" },
      launchCommand: async () => events.push("reload"),
      showHUD: async (message) => events.push(message),
    },
    react: { useState: (initial) => [initial(), () => {}] },
  });
  const command = Command();
  const refresh = () => command.type(command.props).props.children.at(-1).props.children[0].props.onAction();
  await refresh();
  assert.deepEqual(events, [
    ["services/homeassistant/update_entity", "climate.bedroom", "climate.office"],
    "reload",
    "AC refresh requested",
  ]);
  events.length = 0;
  fail = true;
  await refresh();
  assert.equal(events.length, 2);
  assert.match(events[1], /Could not refresh ACs.*Connection failed/);
  events.length = 0;
  states = [];
  await refresh();
  assert.deepEqual(events, ["reload", "AC refresh requested"]);
});
