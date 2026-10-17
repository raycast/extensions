import { render } from "preact";
import { html } from "htm/preact";
import { App } from "./components/App.js";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");

render(html`<${App} />`, container);
