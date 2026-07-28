/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { ofetch } from "ofetch";

import { networkTimeout } from "@/consts";

/**
 * Shared ofetch instance with timeout.
 */
export const timedFetch = ofetch.create({
  timeout: networkTimeout,
});
