/**
 * htm/preact — Apache License 2.0
 * Copyright 2018 Google Inc.
 * https://github.com/developit/htm
 *
 * Binds htm to Preact's h so templates produce Preact VNodes.
 */
import { h, Component, render } from "preact";
import htm from "htm";

const html = htm.bind(h);

export { h, html, render, Component };
