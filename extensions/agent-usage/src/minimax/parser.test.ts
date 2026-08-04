import test from "node:test";
import assert from "node:assert/strict";
import { getCodingModelRemain, getIntervalPercent, getWeeklyPercent } from "./parser";
import type { MiniMaxModelRemain } from "./types";

const NEW_API_RESPONSE: MiniMaxModelRemain[] = [
  {
    start_time: 0,
    end_time: 0,
    remains_time: 9963072,
    current_interval_total_count: 0,
    current_interval_usage_count: 0,
    model_name: "general",
    current_weekly_total_count: 0,
    current_weekly_usage_count: 0,
    weekly_start_time: 0,
    weekly_end_time: 0,
    weekly_remains_time: 9963072,
    current_interval_status: 1,
    current_interval_remaining_percent: 89,
    current_weekly_status: 1,
    current_weekly_remaining_percent: 78,
  },
  {
    start_time: 0,
    end_time: 0,
    remains_time: 0,
    current_interval_total_count: 0,
    current_interval_usage_count: 0,
    model_name: "video",
    current_weekly_total_count: 0,
    current_weekly_usage_count: 0,
    weekly_start_time: 0,
    weekly_end_time: 0,
    weekly_remains_time: 0,
    current_interval_status: 3,
    current_interval_remaining_percent: 100,
    current_weekly_status: 3,
    current_weekly_remaining_percent: 100,
  },
];

test("getCodingModelRemain picks the model with status=1 (active plan window)", () => {
  const picked = getCodingModelRemain(NEW_API_RESPONSE);
  assert.ok(picked);
  assert.equal(picked!.model_name, "general");
});

test("getIntervalPercent returns the percent field when counts are 0", () => {
  const picked = getCodingModelRemain(NEW_API_RESPONSE)!;
  assert.equal(getIntervalPercent(picked), 89);
});

test("getWeeklyPercent returns the percent field when counts are 0", () => {
  const picked = getCodingModelRemain(NEW_API_RESPONSE)!;
  assert.equal(getWeeklyPercent(picked), 78);
});

test("getIntervalPercent returns null for inactive model (status=3)", () => {
  const video = NEW_API_RESPONSE.find((r) => r.model_name === "video")!;
  assert.equal(getIntervalPercent(video), null);
  assert.equal(getWeeklyPercent(video), null);
});

test("getIntervalPercent falls back to counts when percent fields are missing (legacy API)", () => {
  const legacy: MiniMaxModelRemain = {
    start_time: 0,
    end_time: 0,
    remains_time: 0,
    current_interval_total_count: 100,
    current_interval_usage_count: 30,
    model_name: "MiniMax-M1",
    current_weekly_total_count: 1000,
    current_weekly_usage_count: 200,
    weekly_start_time: 0,
    weekly_end_time: 0,
    weekly_remains_time: 0,
  };
  assert.equal(getIntervalPercent(legacy), 70);
  assert.equal(getWeeklyPercent(legacy), 80);
});

test("getCodingModelRemain falls back to MiniMax-M* model name (backward compat)", () => {
  const only: MiniMaxModelRemain[] = [
    {
      start_time: 0,
      end_time: 0,
      remains_time: 0,
      current_interval_total_count: 100,
      current_interval_usage_count: 50,
      model_name: "MiniMax-M1",
      current_weekly_total_count: 0,
      current_weekly_usage_count: 0,
      weekly_start_time: 0,
      weekly_end_time: 0,
      weekly_remains_time: 0,
    },
  ];
  assert.equal(getCodingModelRemain(only)!.model_name, "MiniMax-M1");
});

test("getCodingModelRemain returns null for empty list", () => {
  assert.equal(getCodingModelRemain([]), null);
});
