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
          calls.push([service, data.entity_id, data.hvac_mode]);
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
    ["services/climate/set_hvac_mode", "climate.office", "cool"],
    ["services/homeassistant/update_entity", "climate.office", undefined],
  ]);
  assert.equal(refreshes, 1);
  const turnOff = ACControls({ state: { ...state, state: "cool" }, available: true }).props.children[0];
  calls.length = 0;
  await turnOff.props.onAction();
  assert.deepEqual(calls, [
    ["services/climate/set_hvac_mode", "climate.office", "off"],
    ["services/homeassistant/update_entity", "climate.office", undefined],
  ]);
  assert.equal(refreshes, 2);
  fail = true;
  calls.length = 0;
  await power.props.onAction();
  assert.deepEqual(calls, []);
  assert.equal(refreshes, 2);
  assert.match(messages[0], /AC control failed/);
  fail = false;
  failRefresh = true;
  await turnOff.props.onAction();
  assert.equal(refreshes, 2);
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
