import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { connectService } from "../src/service";
import ModelSettings from "../src/model-settings";
import { launcher } from "./raycast-mock";
import {
  addExclusionFolders,
  formatFolderPaths,
  parseFolderPaths,
  folderRequestPaths,
  reconcileValues,
} from "../src/settings-values";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const response = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
const current = {
  roots: ["/private/tmp/library"],
  excluded_paths: [] as string[],
  model_variant: "mlx-8bit",
  model_url: "",
  dimensions: 512,
  enable_documents: true,
  enable_images: true,
  enable_video: false,
  enable_audio: false,
  video_segment_seconds: 10,
  audio_segment_seconds: 20,
  thumbnail_px: 256,
  chunk_tokens: 512,
  idle_seconds: 60,
};
const snapshot = (values = current) => ({
  current: values,
  job: { state: "complete" },
  storage_path: "/private/tmp/library-storage",
  models: [
    {
      id: "mlx-8bit",
      label: "MLX",
      installed: true,
      recommended: true,
      disk_bytes: 1,
      download_bytes: 1,
    },
  ],
  video_supported: true,
  media_decoder_available: true,
});
const status = { files: 1, chunks: 1, indexing: false };
function field(view: ReactTestRenderer, type: string, id?: string) {
  const found = view.root.findAll(
    (node) => node.type === type && (!id || node.props.id === id),
  );
  assert.equal(found.length, 1, `${type} ${id ?? ""}`);
  return found[0];
}

test("malformed custom URLs reject asynchronously without starting the engine", async () => {
  launcher.serviceURL = "not-a-url";
  const calls = launcher.startupCalls;
  let result!: Promise<string>;
  assert.doesNotThrow(() => {
    result = connectService(() => {});
  });
  assert.ok(result instanceof Promise);
  await assert.rejects(result, /valid local HTTP address/);
  assert.equal(launcher.startupCalls, calls);
  for (const url of [
    "https://localhost:8766",
    "http://example.com",
    "http://user:pass@localhost",
  ]) {
    launcher.serviceURL = url;
    await assert.rejects(
      connectService(() => {}),
      /local HTTP address/,
    );
  }
  launcher.serviceURL = " http://127.0.0.1:8766/ ";
  assert.equal(await connectService(() => {}), "http://127.0.0.1:8766");
  launcher.serviceURL = "";
  launcher.failStartup = true;
  await assert.rejects(
    connectService(() => {}),
    /Synthetic setup failure/,
  );
  launcher.failStartup = false;
  await Promise.all([connectService(() => {}), connectService(() => {})]);
  assert.equal(
    launcher.startupCalls,
    calls + 2,
    "failed startup retries; concurrent callers share startup",
  );
});

test("picker paths and manual edits round-trip without splitting or trimming", () => {
  const saved = ["/private/tmp/excluded"];
  const selected = [
    "/private/tmp/Research ",
    "/private/tmp/line\nbreak",
    "/private/tmp/tail\n",
    "/private/tmp/日本語",
  ];
  const combined = addExclusionFolders(saved, [...selected, ...saved]);
  assert.deepEqual(combined, [...saved, ...selected]);
  assert.deepEqual(parseFolderPaths(formatFolderPaths(combined)), combined);
  assert.deepEqual(
    parseFolderPaths(" ~/Documents/private \n~/Pictures/private\n"),
    ["~/Documents/private", "~/Pictures/private"],
  );
  assert.throws(() => parseFolderPaths('["unfinished"'));
  assert.throws(() => parseFolderPaths("[12]"));
  assert.deepEqual(folderRequestPaths(selected), [
    selected[0] + "/",
    selected[1],
    selected[2] + "/",
    selected[3],
  ]);
});

test("array fields refresh from another launcher while local edits survive", () => {
  const original = {
    roots: ["/private/tmp/a"],
    excluded_paths: ["/private/tmp/private"],
    dimensions: "512",
  };
  const copy = structuredClone(original);
  const updated = {
    roots: ["/private/tmp/b"],
    excluded_paths: ["/private/tmp/private\nfolder"],
    dimensions: "256",
  };
  assert.deepEqual(reconcileValues(copy, original, updated), updated);
  const draft = {
    ...copy,
    excluded_paths: ["/private/tmp/local"],
    dimensions: "128",
  };
  assert.deepEqual(reconcileValues(draft, original, updated), {
    ...draft,
    roots: updated.roots,
  });
});

test("an old completed poll cannot revert Apply or consume the submitted draft", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  let poll!: () => void;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  const stale = deferred<Response>();
  const posted = deferred<Response>();
  let getCount = 0;
  let postCount = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, init?: RequestInit) => {
      if (input.endsWith("/v1/status")) return response(status);
      if (init?.method === "POST") {
        postCount += 1;
        return posted.promise;
      }
      getCount += 1;
      if (getCount === 2) return stale.promise;
      return response(
        snapshot(getCount > 2 ? { ...current, dimensions: 256 } : current),
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () => {
      field(view, "Checkbox", "show_advanced").props.onChange(true);
    });
    await act(async () => {
      field(view, "Dropdown", "dimensions").props.onChange("256");
      poll();
    });
    let applying!: Promise<void>;
    await act(async () => {
      applying = field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () => {
      poll();
      field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () => {
      posted.resolve(response({ state: "applying" }));
      await applying;
    });
    await act(async () => {
      stale.resolve(response(snapshot()));
    });
    assert.equal(field(view, "Dropdown", "dimensions").props.value, "256");
    assert.equal(
      field(view, "Form").props.isLoading,
      true,
      "stale job completion is ignored",
    );
    await act(async () => {
      poll();
    });
    assert.equal(field(view, "Dropdown", "dimensions").props.value, "256");
    assert.equal(field(view, "Form").props.isLoading, false);
    assert.equal(
      postCount,
      1,
      "duplicate Apply is blocked while request is pending",
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("native folder requests preserve exact paths through Apply and exclusion save", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  const requests: { url: string; body: typeof current }[] = [];
  const unusual = [
    "/private/tmp/Research ",
    "/private/tmp/line\nbreak",
    "/private/tmp/tail\n",
  ];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        requests.push({ url, body });
        return response(
          url.endsWith("/v1/exclusions")
            ? {
                excluded_paths: unusual,
                excluded_files_removed: 0,
                excluded_saved_entries_removed: 0,
                cleanup_pending: 0,
              }
            : { state: "applying" },
        );
      }
      return response(url.endsWith("/v1/status") ? status : snapshot());
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () => {
      field(view, "FilePicker", "roots").props.onChange(unusual);
    });
    assert.deepEqual(field(view, "FilePicker", "roots").props.value, unusual);
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.deepEqual(requests[0].body.roots, folderRequestPaths(unusual));
    await act(async () => {
      field(view, "FilePicker", "excluded_folders").props.onChange(unusual);
    });
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.ok(requests[1].url.endsWith("/v1/exclusions"));
    assert.deepEqual(
      requests[1].body.excluded_paths,
      folderRequestPaths(unusual),
    );
    await act(async () => {
      field(view, "Checkbox", "edit_exclusion_paths").props.onChange(true);
    });
    const text = field(view, "TextArea", "excluded_paths").props.value;
    assert.deepEqual(JSON.parse(text), unusual);
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange('["unfinished"');
    });
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.equal(
      requests.length,
      2,
      "invalid manual JSON never submits partial exclusions",
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("invalid custom address shows a repair screen rather than throwing on mount", async () => {
  launcher.serviceURL = "not-a-url";
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    const detail = field(view, "Detail");
    assert.equal(detail.props.isLoading, false);
    assert.match(detail.props.markdown, /valid local HTTP address/);
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("the open exclusion editor follows accepted polls and canonical save responses", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  let poll!: () => void;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  let saved = ["/private/tmp/private"];
  const requests: string[][] = [];
  const saving = deferred<Response>();
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/status")) return response(status);
      if (init?.method === "POST") {
        requests.push(JSON.parse(String(init.body)).excluded_paths);
        return saving.promise;
      }
      return response(snapshot({ ...current, excluded_paths: saved }));
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () => {
      field(view, "Checkbox", "edit_exclusion_paths").props.onChange(true);
    });
    saved = [...saved, "/private/tmp/other-launcher"];
    await act(async () => {
      poll();
    });
    assert.equal(
      field(view, "TextArea", "excluded_paths").props.value,
      saved.join("\n"),
    );
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange(
        saved.join("\n") + "\n~/Documents/private",
      );
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = field(view, "SubmitForm").props.onSubmit();
    });
    assert.deepEqual(requests[0], [...saved, "~/Documents/private"]);
    saved = [...saved, "/private/tmp/resolved/private"];
    await act(async () => {
      saving.resolve(
        response({
          excluded_paths: saved,
          excluded_files_removed: 0,
          excluded_saved_entries_removed: 0,
          cleanup_pending: 0,
        }),
      );
      await pending;
    });
    assert.equal(
      field(view, "TextArea", "excluded_paths").props.value,
      saved.join("\n"),
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("exclusion polling preserves valid formatting, unfinished edits, and edits made during save", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  let poll!: () => void;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  let saved = ["/private/tmp/private"];
  let postCount = 0;
  const saving = deferred<Response>();
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/status")) return response(status);
      if (init?.method === "POST") {
        postCount++;
        return saving.promise;
      }
      return response(snapshot({ ...current, excluded_paths: saved }));
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () => {
      field(view, "Checkbox", "edit_exclusion_paths").props.onChange(true);
    });
    const draft = ' [ "/private/tmp/local" ] ';
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange(draft);
    });
    saved = [...saved, "/private/tmp/other-launcher"];
    await act(async () => {
      poll();
    });
    assert.equal(field(view, "TextArea", "excluded_paths").props.value, draft);
    const unfinished = '["/private/tmp/unfinished"';
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange(unfinished);
    });
    await act(async () => {
      poll();
    });
    assert.equal(
      field(view, "TextArea", "excluded_paths").props.value,
      unfinished,
    );
    assert.ok(field(view, "TextArea", "excluded_paths").props.error);
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.equal(
      postCount,
      0,
      "unfinished input cannot submit a different hidden list",
    );
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange(
        "~/Documents/first",
      );
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () => {
      field(view, "TextArea", "excluded_paths").props.onChange(
        "~/Documents/newer-draft",
      );
    });
    await act(async () => {
      saving.resolve(
        response({
          excluded_paths: ["/private/tmp/resolved/first"],
          excluded_files_removed: 0,
          excluded_saved_entries_removed: 0,
          cleanup_pending: 0,
        }),
      );
      await pending;
    });
    assert.equal(
      field(view, "TextArea", "excluded_paths").props.value,
      "~/Documents/newer-draft",
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("failed Apply keeps edits and polling resumes without accepting stale errors", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.toasts.length = 0;
  let poll!: () => void;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  const stale = deferred<Response>();
  let getCount = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/status")) return response(status);
      if (init?.method === "POST")
        return new Response(
          JSON.stringify({ detail: "Synthetic validation failure" }),
          { status: 422 },
        );
      if (++getCount === 2) return stale.promise;
      return response(snapshot());
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () => {
      field(view, "Checkbox", "show_advanced").props.onChange(true);
    });
    await act(async () => {
      field(view, "Dropdown", "dimensions").props.onChange("256");
      poll();
    });
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () => {
      stale.resolve(new Response("stale failure", { status: 500 }));
    });
    assert.equal(field(view, "Dropdown", "dimensions").props.value, "256");
    assert.equal(field(view, "Form").props.isLoading, false);
    assert.ok(
      launcher.toasts.some((toast) => toast.title === "Model setup failed"),
    );
    assert.ok(
      !view.root
        .findAll((node) => node.props.title === "Status")
        .some((node) =>
          String(node.props.text).includes("Service returned 500"),
        ),
    );
    await act(async () => {
      poll();
    });
    assert.equal(getCount, 3, "fresh polling resumes after failed mutation");
    assert.equal(field(view, "Dropdown", "dimensions").props.value, "256");
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});
