import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { deflateSync } from "zlib";
import { afterEach, describe, expect, it } from "vitest";
import { loadDocDetail, loadInventory } from "../lib/docs-source";
import type { InventoryItem } from "../lib/inventory";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("docs source loading", () => {
  it("falls back to local inventory when remote inventory fails", async () => {
    const docsDirectory = await createDocsDirectory("stable");
    await writeFile(path.join(docsDirectory, "stable", "objects.inv"), createInventory());

    const result = await loadInventory({
      deps: {
        fetchImpl: async () => new Response("unavailable", { status: 503, statusText: "Service Unavailable" }),
      },
      localDocsDirectory: docsDirectory,
      mode: "online",
    });

    expect(result.source).toBe("local");
    expect(result.remoteError?.message).toContain("503");
    expect(result.data[0]?.name).toBe("pandas.Series.head");
  });

  it("throws the remote error when fallback has no local docs directory", async () => {
    await expect(
      loadInventory({
        deps: {
          fetchImpl: async () => new Response("unavailable", { status: 503, statusText: "Service Unavailable" }),
        },
        mode: "online",
      }),
    ).rejects.toThrow("503");
  });

  it("loads local HTML detail from disk", async () => {
    const docsDirectory = await createDocsDirectory("stable");
    const htmlPath = path.join(docsDirectory, "stable", "reference", "generated");
    await mkdir(htmlPath, { recursive: true });
    await writeFile(path.join(htmlPath, "pandas.Series.head.html"), createHtml());

    const result = await loadDocDetail({
      item: createItem(),
      localDocsDirectory: docsDirectory,
      mode: "local",
    });

    expect(result.source).toBe("local");
    expect(result.data.signature).toContain("Series.head");
    expect(result.data.description[0]).toBe("Return the first n rows.");
  });

  it("loads local inventory when stable is a text-file symlink placeholder", async () => {
    const docsDirectory = await createDocsDirectory("2.2");
    await writeFile(path.join(docsDirectory, "stable"), "2.2");
    await writeFile(path.join(docsDirectory, "2.2", "objects.inv"), createInventory());

    const result = await loadInventory({
      localDocsDirectory: docsDirectory,
      mode: "local",
    });

    expect(result.source).toBe("local");
    expect(result.data[0]?.docPath).toBe("reference/generated/pandas.Series.head.html#pandas.Series.head");
  });

  it("loads local HTML when stable is a text-file symlink placeholder", async () => {
    const docsDirectory = await createDocsDirectory("2.2");
    await writeFile(path.join(docsDirectory, "stable"), "2.2");
    const htmlPath = path.join(docsDirectory, "2.2", "reference", "generated");
    await mkdir(htmlPath, { recursive: true });
    await writeFile(path.join(htmlPath, "pandas.Series.head.html"), createHtml());

    const result = await loadDocDetail({
      item: createItem(),
      localDocsDirectory: docsDirectory,
      mode: "local",
    });

    expect(result.source).toBe("local");
    expect(result.data.description[0]).toBe("Return the first n rows.");
  });
});

async function createDocsDirectory(versionDirectory: string) {
  const docsDirectory = await mkdtemp(path.join(tmpdir(), "pandas-docs-"));
  tempDirectories.push(docsDirectory);
  await mkdir(path.join(docsDirectory, versionDirectory), { recursive: true });
  return docsDirectory;
}

function createInventory() {
  const header = [
    "# Sphinx inventory version 2",
    "# Project: pandas",
    "# Version: 2.2",
    "# The remainder of this file is compressed using zlib.",
  ].join("\n");
  const body = "pandas.Series.head py:method 1 reference/generated/pandas.Series.head.html#pandas.Series.head -\n";

  return Buffer.concat([Buffer.from(`${header}\n`), deflateSync(body)]);
}

function createItem(): InventoryItem {
  return {
    displayName: "pandas.Series.head",
    docPath: "reference/generated/pandas.Series.head.html#pandas.Series.head",
    id: "pandas.Series.head",
    name: "pandas.Series.head",
    role: "py:method",
    shortName: "Series.head",
    url: "https://pandas.pydata.org/docs/reference/generated/pandas.Series.head.html#pandas.Series.head",
  };
}

function createHtml() {
  return `
    <section>
      <dl class="py method">
        <dt id="pandas.Series.head">pandas.Series.head(n=5)</dt>
        <dd>
          <p>Return the first n rows.</p>
        </dd>
      </dl>
    </section>
  `;
}
