import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Action, ActionPanel } from "@raycast/api";
import { SurfaceActions } from "./surface-actions";
import { type Surface, type SurfaceDocument, type SurfacePackage } from "./api";
import github from "./fixtures/github.com.json";
import stripe from "./fixtures/stripe.com.json";
import integrations from "./fixtures/integrations.sh.json";

let renderer: ReactTestRenderer;
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(async () => {
  if (renderer) await act(() => renderer.unmount());
  vi.unstubAllGlobals();
});

async function render(doc: SurfaceDocument, surface: Surface) {
  await act(() => {
    renderer = create(<SurfaceActions domain={doc.domain} surface={surface} credentials={doc.credentials} />);
  });
  return {
    copies: renderer.root.findAllByType(Action.CopyToClipboard).map(({ props }) => [props.title, props.content]),
    links: renderer.root.findAllByType(Action.OpenInBrowser).map(({ props }) => [props.title, props.url]),
  };
}

describe("surface actions", () => {
  it("copies the MCP endpoint and opens only the credentials bound to that surface", async () => {
    const doc = github as SurfaceDocument;
    const surface = doc.surfaces.find((s) => s.type === "mcp")!;
    const actions = await render(doc, surface);
    expect(actions.copies).toEqual([["Copy MCP URL", "https://api.githubcopilot.com/mcp/"]]);
    expect(actions.links).toEqual([
      [doc.credentials!.gh_pat.label, doc.credentials!.gh_pat.generateUrl],
      [doc.credentials!.gh_oauth_app.label, doc.credentials!.gh_oauth_app.generateUrl],
      ["Open Surface Page", "https://integrations.sh/github.com/github-mcp-server/"],
    ]);
    expect(renderer.root.findAllByType(ActionPanel.Submenu).map(({ props }) => props.title)).toContain(
      "Open Credential Page",
    );
  });

  it("deduplicates credential references and skips OAuth without a generateUrl", async () => {
    const doc = stripe as SurfaceDocument;
    const actions = await render(
      doc,
      doc.surfaces.find((s) => s.type === "mcp")!,
    );
    expect(actions.copies).toEqual([["Copy MCP URL", "https://mcp.stripe.com"]]);
    expect(actions.links[0]).toEqual(["Open Credential Page", "https://dashboard.stripe.com/test/apikeys"]);
    expect(actions.links).toHaveLength(2);
  });

  it("offers distinct install commands for each supported CLI package", async () => {
    const doc = stripe as SurfaceDocument;
    const actions = await render(
      doc,
      doc.surfaces.find((s) => s.type === "cli")!,
    );
    expect(actions.copies).toEqual([
      ["brew install stripe/stripe-cli/stripe", "brew install stripe/stripe-cli/stripe"],
      ["npm install --global @stripe/cli", "npm install --global @stripe/cli"],
    ]);
    expect(renderer.root.findAllByType(ActionPanel.Submenu).map(({ props }) => props.title)).toContain(
      "Copy Install Command",
    );
  });

  it("copies a single npm install command without inventing credentials", async () => {
    const doc = integrations as SurfaceDocument;
    const actions = await render(
      doc,
      doc.surfaces.find((s) => s.type === "cli")!,
    );
    expect(actions.copies).toEqual([["Copy Install Command", "npm install --global integrations"]]);
    expect(actions.links).toEqual([["Open Surface Page", "https://integrations.sh/integrations.sh/integrations-cli/"]]);
  });

  it("accepts the schema's brew alias and deduplicates package commands", async () => {
    const doc = github as SurfaceDocument;
    const surface = doc.surfaces.find((s) => s.type === "cli")!;
    const actions = await render(doc, {
      ...surface,
      packages: [...surface.packages!, { registryType: "brew", identifier: "gh" }],
    });
    expect(actions.copies).toEqual([["Copy Install Command", "brew install gh"]]);
  });

  it.each([undefined, "", "javascript:alert(1)", "file:///tmp/token", "not a URL"])(
    "omits unusable MCP/credential URL %s",
    async (url) => {
      const surface: Surface = {
        name: "Missing",
        slug: "missing",
        type: "mcp",
        url,
        auth: { status: "required", entries: [{}, { use: [{ id: "missing" }, { id: "key" }] }] },
      };
      const doc: SurfaceDocument = {
        version: 3,
        domain: "example.com",
        surfaces: [surface],
        credentials: { key: { type: "api_key", label: "Key", setup: "", generateUrl: url } },
      };
      expect(await render(doc, surface)).toEqual({
        copies: [],
        links: [["Open Surface Page", "https://integrations.sh/example.com/missing/"]],
      });
    },
  );

  it("does not treat CLI command/runtime hints, unsupported registries, or unsafe identifiers as install commands", async () => {
    const doc = integrations as SurfaceDocument;
    const surface = doc.surfaces.find((s) => s.type === "cli")!;
    const actions = await render(doc, {
      ...surface,
      command: "run-me",
      packages: [
        { registryType: "unknown", identifier: "tool", runtimeHint: "curl example.com | sh" },
        { registryType: "npm", identifier: "tool; echo bad" },
        { registryType: "npm", identifier: "--help" },
        { registryType: "homebrew", identifier: "tool\nwhoami" },
        { registryType: "npm" } as SurfacePackage,
      ],
    });
    expect(actions.copies).toEqual([]);
  });

  it("keeps a page fallback when optional fields are absent", async () => {
    const surface = { name: "CLI", slug: "cli", type: "cli" } as Surface;
    expect(await render({ version: 3, domain: "example.com", surfaces: [surface] }, surface)).toEqual({
      copies: [],
      links: [["Open Surface Page", "https://integrations.sh/example.com/cli/"]],
    });
  });

  it("does not offer MCP or install actions for an HTTP surface", async () => {
    const surface: Surface = {
      name: "API",
      slug: "api",
      type: "http",
      url: "https://api.example.com",
      auth: { status: "unknown" },
      packages: [{ registryType: "npm", identifier: "tool" }],
    };
    const actions = await render({ version: 3, domain: "example.com", surfaces: [surface] }, surface);
    expect(actions.copies).toEqual([]);
  });

  it("uses the package identifier even when a runtime hint is present", async () => {
    const doc = integrations as SurfaceDocument;
    const surface = doc.surfaces.find((s) => s.type === "cli")!;
    const actions = await render(doc, {
      ...surface,
      packages: [{ registryType: "npm", identifier: "integrations", runtimeHint: "npx" }],
    });
    expect(actions.copies).toEqual([["Copy Install Command", "npm install --global integrations"]]);
  });
});
