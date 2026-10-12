import { test } from "node:test";
import assert from "node:assert/strict";
import { LaunchType } from "@raycast/api";
import { createElement } from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { connectService } from "../src/service";
import ModelSettings from "../src/model-settings";
import SemanticSearch from "../src/semantic-search";
import { launcher, environment } from "./raycast-mock";
import AutomaticIndex from "../src/automatic-index";
import {
  addExclusionFolders,
  formatFolderPaths,
  parseFolderPaths,
  folderRequestPaths,
  reconcileValues,
} from "../src/settings-values";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function folderList(view: ReactTestRenderer): string {
  return view.root.findAll(
    (node) =>
      String(node.type) === "Description" &&
      node.props.title === "Folders to Search",
  )[0].props.text;
}

test("full Apply preserves folders selected after the submitted snapshot", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  let poll!: () => void;
  let posted!: typeof current;
  let server = current;
  const pending = deferred<Response>();
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted = JSON.parse(String(init.body));
        return pending.promise;
      }
      return response(url.endsWith("/v1/settings") ? snapshot(server) : status);
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange(["/private/tmp/b"]),
    );
    await act(async () =>
      field(view, "Checkbox", "enable_images").props.onChange(false),
    );
    let request!: Promise<void>;
    await act(async () => {
      request = field(view, "SubmitForm").props.onSubmit();
    });
    assert.deepEqual(posted.roots, [...current.roots, "/private/tmp/b"]);
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange(["/private/tmp/c"]),
    );
    await act(async () => {
      pending.resolve(response({ state: "applying" }));
      await request;
    });
    server = { ...current, ...posted };
    await act(async () => poll());
    assert.deepEqual(folderList(view).split("\n"), [
      ...current.roots,
      "/private/tmp/b",
      "/private/tmp/c",
    ]);
    assert.equal(field(view, "SubmitForm").props.title, "Save Search Folders");
  } finally {
    await act(async () => view?.unmount());
  }
});

test("removal completion preserves a newer folder and its explicit purge choice", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  const selected = { ...current, roots: ["/private/tmp/a", "/private/tmp/b"] };
  const pending = deferred<Response>();
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return pending.promise;
      return response(
        url.endsWith("/v1/settings") ? snapshot(selected) : status,
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "Dropdown", "folder_to_remove").props.onChange(
        selected.roots[0],
      ),
    );
    let request!: Promise<void>;
    await act(async () => {
      request = field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () =>
      field(view, "Dropdown", "folder_to_remove").props.onChange(
        selected.roots[1],
      ),
    );
    await act(async () =>
      field(view, "Checkbox", "delete_folder_index").props.onChange(true),
    );
    await act(async () => {
      pending.resolve(
        response({
          roots: [selected.roots[1]],
          deleted_entries: 0,
          cleanup_pending: 0,
        }),
      );
      await request;
    });
    assert.equal(
      field(view, "Dropdown", "folder_to_remove").props.value,
      selected.roots[1],
    );
    assert.equal(
      field(view, "Checkbox", "delete_folder_index").props.value,
      true,
    );
    assert.equal(
      field(view, "SubmitForm").props.title,
      "Remove Folder & Delete Index",
    );
  } finally {
    await act(async () => view?.unmount());
  }
});

test("a submitted folder cannot appear removed before setup has accepted it", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.toasts.length = 0;
  let server = current;
  let poll!: () => void;
  const posts: string[] = [];
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts.push(url);
        if (url.endsWith("/v1/settings"))
          return response({ state: "applying" });
        assert.ok(url.endsWith("/v1/folders/remove"));
        server = { ...server, roots: current.roots };
        return response({
          roots: current.roots,
          deleted_entries: 0,
          cleanup_pending: 0,
        });
      }
      return response(url.endsWith("/v1/settings") ? snapshot(server) : status);
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange(["/private/tmp/b"]),
    );
    await act(async () =>
      field(view, "Checkbox", "enable_images").props.onChange(false),
    );
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    await act(async () =>
      field(view, "Dropdown", "folder_to_remove").props.onChange(
        "/private/tmp/b",
      ),
    );
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    assert.equal(posts.length, 1);
    assert.deepEqual(folderList(view).split("\n"), [
      ...current.roots,
      "/private/tmp/b",
    ]);
    assert.ok(
      launcher.toasts.some(
        (toast) => toast.title === "This folder is being applied",
      ),
    );
    server = {
      ...current,
      roots: [...current.roots, "/private/tmp/b"],
      enable_images: false,
    };
    await act(async () => poll());
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    assert.equal(posts.length, 2);
    assert.deepEqual(folderList(view).split("\n"), current.roots);
    await act(async () => poll());
    assert.deepEqual(folderList(view).split("\n"), current.roots);
  } finally {
    await act(async () => view?.unmount());
  }
});

test("native folder additions accumulate across picker opens and save only additions", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  const posts: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        assert.ok(url.endsWith("/v1/folders/add"));
        return response({
          roots: [...current.roots, "/private/tmp/b", "/private/tmp/c"],
          state: "complete",
        });
      }
      return response(url.endsWith("/v1/settings") ? snapshot() : status);
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange(["/private/tmp/b"]),
    );
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange([
        "/private/tmp/c",
        "/private/tmp/b",
      ]),
    );
    assert.deepEqual(folderList(view).split("\n"), [
      ...current.roots,
      "/private/tmp/b",
      "/private/tmp/c",
    ]);
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    assert.deepEqual(posts, [{ paths: ["/private/tmp/b", "/private/tmp/c"] }]);
    assert.equal(field(view, "SubmitForm").props.title, "Update Search Index");
  } finally {
    await act(async () => view?.unmount());
  }
});

for (const deleting of [false, true]) {
  test(`folder removal sends explicit delete choice (${deleting}) and preserves unsaved additions`, async (t) => {
    launcher.serviceURL = "http://127.0.0.1:18799";
    t.mock.method(globalThis, "setInterval", () => 1);
    t.mock.method(globalThis, "clearInterval", () => {});
    const roots = ["/private/tmp/a", "/private/tmp/b"];
    const posts: unknown[] = [];
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          assert.ok(url.endsWith("/v1/folders/remove"));
          posts.push(JSON.parse(String(init.body)));
          return response({
            roots: [roots[1]],
            deleted_entries: deleting ? 3 : 0,
            cleanup_pending: 0,
          });
        }
        return response(
          url.endsWith("/v1/settings")
            ? snapshot({ ...current, roots })
            : status,
        );
      },
    );
    let view!: ReactTestRenderer;
    try {
      await act(async () => {
        view = create(createElement(ModelSettings));
      });
      await act(async () =>
        field(view, "FilePicker", "roots").props.onChange(["/private/tmp/c"]),
      );
      await act(async () =>
        field(view, "Dropdown", "folder_to_remove").props.onChange(roots[0]),
      );
      assert.equal(
        field(view, "Checkbox", "delete_folder_index").props.value,
        false,
      );
      if (deleting)
        await act(async () =>
          field(view, "Checkbox", "delete_folder_index").props.onChange(true),
        );
      assert.equal(
        field(view, "SubmitForm").props.title,
        deleting ? "Remove Folder & Delete Index" : "Remove Search Folder",
      );
      const remove = view.root.findAll(
        (node) =>
          String(node.type) === "Action" &&
          node.props.title === "Remove Selected Folder",
      )[0];
      await act(async () => remove.props.onAction());
      assert.deepEqual(posts, [
        { path: roots[0], delete_saved_index: deleting },
      ]);
      assert.deepEqual(folderList(view).split("\n"), [
        roots[1],
        "/private/tmp/c",
      ]);
      assert.equal(
        field(view, "SubmitForm").props.title,
        "Save Search Folders",
      );
    } finally {
      await act(async () => view?.unmount());
    }
  });
}

test("folder polling follows another host's removals while keeping only local additions", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  let poll!: () => void;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  let roots = [...current.roots];
  const posts: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return response({
          roots: [...roots, "/private/tmp/resolved"],
          state: "complete",
        });
      }
      return response(
        url.endsWith("/v1/settings") ? snapshot({ ...current, roots }) : status,
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "FilePicker", "roots").props.onChange(["/private/tmp/link"]),
    );
    roots = ["/private/tmp/from-other-host"];
    await act(async () => poll());
    assert.deepEqual(folderList(view).split("\n"), [
      ...roots,
      "/private/tmp/link",
    ]);
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    assert.deepEqual(posts, [{ paths: ["/private/tmp/link"] }]);
    assert.deepEqual(folderList(view).split("\n"), [
      ...roots,
      "/private/tmp/resolved",
    ]);
    assert.equal(field(view, "SubmitForm").props.title, "Update Search Index");
  } finally {
    await act(async () => view?.unmount());
  }
});

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

for (const command of ["settings", "search"] as const) {
  test(`${command} explicitly retries skipped files without changing settings`, async (t) => {
    launcher.serviceURL = "http://127.0.0.1:18799";
    t.mock.method(globalThis, "setInterval", () => 1);
    t.mock.method(globalThis, "clearInterval", () => {});
    const posts: { url: string; body: unknown }[] = [];
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          if (url.endsWith("/v1/index/start"))
            posts.push({ url, body: JSON.parse(String(init.body)) });
          return response({ state: "indexing" });
        }
        return response(
          url.endsWith("/v1/settings")
            ? snapshot()
            : {
                ...status,
                roots: current.roots,
                last_index_summary: {
                  added: 0,
                  updated: 0,
                  unchanged: 1,
                  deleted: 0,
                  errors: 0,
                  cached_skips: 3,
                  retry_deferred: 2,
                },
              },
        );
      },
    );
    let view!: ReactTestRenderer;
    try {
      await act(async () => {
        view = create(
          command === "settings"
            ? createElement(ModelSettings)
            : createElement(SemanticSearch, {
                arguments: { query: "" },
                launchType: LaunchType.UserInitiated,
              }),
        );
      });
      if (command === "settings") {
        const overview = view.root.findAll(
          (node) =>
            String(node.type) === "Description" &&
            node.props.title === "Search index",
        )[0].props.text;
        assert.match(overview, /3 skipped without retry/);
        assert.match(overview, /2 waiting to retry/);
      }
      const action = view.root.findAll(
        (node) =>
          String(node.type) === "Action" &&
          node.props.title === "Retry Skipped Files",
      );
      assert.equal(action.length, 1);
      await act(async () => action[0].props.onAction());
      assert.deepEqual(posts, [
        {
          url: "http://127.0.0.1:18799/v1/index/start",
          body: { retry_skipped: true },
        },
      ]);
      assert.equal(launcher.toasts.at(-1)?.title, "Retrying skipped files");
    } finally {
      await act(async () => view?.unmount());
    }
  });
}

test("settings keeps one loading view through connection and fetching, without installation instructions", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  const settingsResponse = deferred<Response>();
  t.mock.method(globalThis, "fetch", async (url: string) =>
    url.endsWith("/v1/settings") ? settingsResponse.promise : response(status),
  );
  let view!: ReactTestRenderer;
  try {
    act(() => {
      view = create(createElement(ModelSettings));
    });
    const initialList = field(view, "List");
    assert.equal(field(view, "ListItem").props.title, "Loading settings…");
    assert.equal(
      view.root.findAll((node) => String(node.type) === "Detail").length,
      0,
    );
    assert.equal(
      view.root.findAll((node) => String(node.type) === "Action").length,
      0,
    );
    await act(async () => {});
    assert.equal(
      field(view, "List"),
      initialList,
      "connection must not replace the loading view",
    );
    assert.equal(field(view, "ListItem").props.title, "Loading settings…");
    await act(async () => {
      settingsResponse.resolve(response(snapshot()));
    });
    assert.ok(field(view, "Form"));
    assert.equal(
      view.root.findAll((node) => String(node.type) === "Detail").length,
      0,
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("search keeps its list and query input while connecting without flashing setup", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(globalThis, "fetch", async (url: string) =>
    response(
      url.endsWith("/v1/status")
        ? { ...status, roots: ["/private/tmp/library"] }
        : {},
    ),
  );
  let view!: ReactTestRenderer;
  try {
    act(() => {
      view = create(
        createElement(SemanticSearch, {
          arguments: { query: "" },
          launchType: LaunchType.UserInitiated,
        }),
      );
    });
    const initialList = field(view, "List");
    assert.equal(initialList.props.isLoading, false);
    assert.equal(
      field(view, "ListEmptyView").props.title,
      "Describe What You Remember",
    );
    assert.equal(
      view.root.findAll((node) => String(node.type) === "Detail").length,
      0,
    );
    await act(async () => {});
    assert.equal(
      field(view, "List"),
      initialList,
      "search input must survive connection",
    );
    assert.equal(
      field(view, "ListEmptyView").props.title,
      "Describe What You Remember",
    );
    assert.equal(
      view.root.findAll((node) => String(node.type) === "Detail").length,
      0,
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

test("connection failures still show setup and can retry in both commands", async (t) => {
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(globalThis, "fetch", async (url: string) =>
    response(
      url.endsWith("/v1/settings")
        ? snapshot()
        : { ...status, roots: current.roots },
    ),
  );
  for (const command of [ModelSettings, SemanticSearch]) {
    launcher.serviceURL = "not-a-url";
    let view!: ReactTestRenderer;
    try {
      await act(async () => {
        view = create(
          createElement(command as typeof SemanticSearch, {
            arguments: { query: "" },
            launchType: LaunchType.UserInitiated,
          }),
        );
      });
      const detail = field(view, "Detail");
      assert.equal(detail.props.isLoading, false);
      assert.match(String(detail.props.markdown), /valid local HTTP address/);
      assert.equal(field(view, "Action").props.title, "Check Installation");
      assert.ok(field(view, "OpenInBrowser"));
      launcher.serviceURL = "http://127.0.0.1:18799";
      await act(async () => {
        await field(view, "Action").props.onAction();
      });
      assert.equal(
        view.root.findAll((node) => String(node.type) === "Detail").length,
        0,
      );
      assert.ok(field(view, command === ModelSettings ? "Form" : "List"));
    } finally {
      await act(async () => {
        view?.unmount();
      });
    }
  }
});

test("Photos-only search keeps its source status and does not require folders", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(globalThis, "fetch", async (url: string) =>
    response(
      url.endsWith("/v1/status")
        ? {
            ...status,
            roots: [],
            photos_library: { enabled: true, indexed: 1 },
          }
        : {},
    ),
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(
        createElement(SemanticSearch, {
          arguments: { query: "" },
          launchType: LaunchType.UserInitiated,
        }),
      );
    });
    assert.equal(
      field(view, "ListSection").props.title,
      "Apple Photos · 1 files",
    );
    assert.equal(
      field(view, "ListEmptyView").props.title,
      "Describe What You Remember",
    );
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

for (const end of [
  "selection",
  "close",
  "library",
  "active",
  "late-close",
] as const) {
  test(
    end === "active"
      ? "Active Photos metadata resumes after a busy response"
      : `Photos metadata stops busy retries after ${end}`,
    async (t) => {
      launcher.serviceURL = "http://127.0.0.1:18799";
      t.mock.method(globalThis, "setInterval", () => 1);
      t.mock.method(globalThis, "clearInterval", () => {});
      const retries: (() => void)[] = [];
      const lateResponse = deferred<Response>();
      t.mock.method(
        globalThis,
        "setTimeout",
        (callback: () => void, delay: number) => {
          if (delay === 250) retries.push(callback);
          else queueMicrotask(callback);
          return 1;
        },
      );
      t.mock.method(globalThis, "clearTimeout", () => {});
      const photos = ["first", "second"].map((id) => ({
        path: `photos://asset/${id}`,
        name: `${id}.jpg`,
        source: "photos",
        kind: "image",
        score: 1,
        snippet: "",
      }));
      let oldRequests = 0;
      t.mock.method(
        globalThis,
        "fetch",
        async (url: string, init?: RequestInit) => {
          if (url.endsWith("/v1/search")) return response({ results: photos });
          if (url.endsWith("/v1/status"))
            return response({
              ...status,
              roots: [],
              photos_library: { enabled: true, indexed: 2 },
            });
          if (url.endsWith("/v1/preview"))
            return response({
              preview: "data:image/jpeg;base64,/9j/",
              pages: 0,
            });
          if (url.endsWith("/v1/photos/details")) {
            if (JSON.parse(String(init?.body)).path === photos[0].path) {
              oldRequests += 1;
              if (oldRequests === 1) {
                if (end === "late-close") return lateResponse.promise;
                return new Response("busy", { status: 409 });
              }
            }
            return response({ created_at: 1700000000 });
          }
          return response({});
        },
      );
      let view!: ReactTestRenderer;
      try {
        await act(async () => {
          view = create(
            createElement(SemanticSearch, {
              arguments: { query: "a photo" },
              launchType: LaunchType.UserInitiated,
            }),
          );
        });
        assert.equal(oldRequests, 1);
        assert.equal(retries.length, end === "late-close" ? 0 : 1);
        await act(async () => {
          if (end === "selection")
            field(view, "List").props.onSelectionChange(photos[1].path);
          else if (end === "close" || end === "late-close") view.unmount();
          else if (end === "library") {
            const manage = view.root.findAll(
              (node) =>
                String(node.type) === "Action" &&
                node.props.title === "Manage Library",
            )[0];
            manage.props.onAction();
          }
        });
        await act(async () => {
          if (end === "late-close")
            lateResponse.resolve(new Response("busy", { status: 409 }));
          else retries.shift()!();
        });
        assert.equal(
          oldRequests,
          end === "active" ? 2 : 1,
          "only active metadata may retry",
        );
        assert.equal(
          retries.length,
          0,
          "abandoned metadata must not schedule another retry",
        );
        if (end === "selection" || end === "active") {
          const row = field(
            view,
            "ListItem",
            photos[end === "selection" ? 1 : 0].path,
          );
          const detail = row.findAll(
            (node) => String(node.type) === "ListItemDetail",
          )[0];
          assert.match(String(detail.props.markdown), /Date taken:/);
        }
      } finally {
        await act(async () => {
          view?.unmount();
        });
      }
    },
  );
}

test("Photos result copies image data and shows capture date without exposing internal links", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.toasts.length = 0;
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(globalThis, "setTimeout", (callback: () => void) => {
    queueMicrotask(callback);
    return 1;
  });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const copied: unknown[] = [];
  const item = {
    path: "photos://asset/test-asset",
    name: "sample.jpg",
    source: "photos",
    kind: "image",
    score: 1,
    snippet: "",
    open_target: "photos://asset?identifier=test-asset",
  };
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/search")) return response({ results: [item] });
      if (url.endsWith("/v1/status"))
        return response({
          ...status,
          roots: [],
          photos_library: { enabled: true, indexed: 1 },
        });
      if (url.endsWith("/v1/photos/details"))
        return response({ created_at: 1700000000 });
      if (url.endsWith("/v1/photos/copy")) {
        copied.push(JSON.parse(String(init?.body)));
        if (copied.length === 1) return new Response("busy", { status: 409 });
        return response({ copied: true, width: 4000, height: 3000 });
      }
      if (url.endsWith("/v1/preview"))
        return response({ preview: "data:image/jpeg;base64,/9j/", pages: 0 });
      return response({});
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(
        createElement(SemanticSearch, {
          arguments: { query: "a photo" },
          launchType: LaunchType.UserInitiated,
        }),
      );
    });
    const markdown = String(field(view, "ListItemDetail").props.markdown);
    assert.match(markdown, /Date taken:/);
    assert.doesNotMatch(markdown, /photos:\/\/|Photos link/);
    assert.equal(
      view.root.findAll((node) => node.props.title === "Copy Photos Link")
        .length,
      0,
    );
    const action = view.root.findAll(
      (node) =>
        String(node.type) === "Action" && node.props.title === "Copy Photo",
    );
    assert.equal(action.length, 1);
    await act(async () => {
      await action[0].props.onAction();
    });
    assert.deepEqual(copied, [{ path: item.path }, { path: item.path }]);
    assert.equal(launcher.toasts.at(-1)?.title, "Photo copied");
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});
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
  const requests: {
    url: string;
    body: typeof current & { paths?: string[] };
  }[] = [];
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
            : url.endsWith("/v1/folders/add")
              ? { roots: [...current.roots, ...unusual], state: "complete" }
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
    assert.deepEqual(field(view, "FilePicker", "roots").props.value, []);
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.ok(requests[0].url.endsWith("/v1/folders/add"));
    assert.deepEqual(requests[0].body.paths, folderRequestPaths(unusual));
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

test("Photos-only video settings apply without a folder and show separate source storage", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  const photos = {
    ...current,
    roots: [],
    enable_photos_library: true,
    photos_allow_network: false,
    enable_images: false,
    enable_video: true,
  };
  let posted: Record<string, unknown> | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted = JSON.parse(String(init.body));
        return response({ state: "applying" });
      }
      return response(
        url.endsWith("/v1/status")
          ? {
              ...status,
              photos_library: {
                by_kind: [
                  { kind: "video", files: 2, vectors: 10, vector_bytes: 20480 },
                ],
              },
            }
          : snapshot(photos),
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    assert.equal(
      field(view, "Checkbox", "enable_photos_library").props.value,
      true,
    );
    const source = view.root.findAll(
      (node) =>
        String(node.type) === "Description" &&
        node.props.title === "Photos index",
    );
    assert.equal(source[0].props.text, "2 videos · 0.02 MB of vectors");
    await act(async () => {
      field(view, "Checkbox", "photos_allow_network").props.onChange(true);
    });
    await act(async () => {
      await field(view, "SubmitForm").props.onSubmit();
    });
    assert.deepEqual(posted?.roots, []);
    assert.equal(posted?.enable_photos_library, true);
    assert.equal(posted?.enable_images, false);
    assert.equal(posted?.enable_video, true);
    assert.equal(posted?.photos_allow_network, true);
  } finally {
    await act(async () => {
      view?.unmount();
    });
  }
});

const automaticOff = {
  enabled: false,
  interval_seconds: 10800,
  only_on_power: true,
  paused: false,
  revision: 0,
  last_reason: "disabled",
};
const syntheticOwner = {
  pid: 12345,
  host: "Tinycast",
  started: "synthetic",
  executable: "/synthetic/Tinycast",
  extension_path: "/private/tmp/synthetic-extension",
  extension_marker: "1:2",
};

test("automatic settings save during indexing without applying model or folder edits", async (t) => {
  const launchesBefore = launcher.launches.length;
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.owner = syntheticOwner;
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, "setInterval", () => 1);
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push({ url, body });
        return response({ ...automaticOff, ...body, revision: 1 });
      }
      return response(
        url.endsWith("/v1/settings")
          ? {
              ...snapshot(),
              job: { state: "indexing" },
              automatic: automaticOff,
            }
          : { ...status, indexing: true },
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "Checkbox", "enable_documents").props.onChange(false),
    );
    await act(async () =>
      field(view, "Checkbox", "automatic_enabled").props.onChange(true),
    );
    assert.equal(
      field(view, "SubmitForm").props.title,
      "Save Automatic Update Settings",
    );
    await act(async () => field(view, "SubmitForm").props.onSubmit());
    assert.equal(posts.length, 1);
    assert.ok(posts[0].url.endsWith("/v1/automatic"));
    assert.equal(posts[0].body.enabled, true);
    assert.equal(posts[0].body.only_on_power, true);
    assert.equal(posts[0].body.roots, undefined);
    assert.equal(posts[0].body.enable_documents, undefined);
    assert.deepEqual(posts[0].body.launcher, syntheticOwner);
    assert.equal(
      field(view, "Checkbox", "enable_documents").props.value,
      false,
    );
    assert.ok(
      view.root.findAll(
        (node) =>
          String(node.type) === "Action" &&
          node.props.title === "Activate Background Checks",
      ).length,
    );
    assert.equal(launcher.launches.length, launchesBefore);
  } finally {
    launcher.owner = undefined;
    await act(async () => view?.unmount());
  }
});

test("automatic settings preserve newer edits and reject a stale pre-save poll", async (t) => {
  const launchesBefore = launcher.launches.length;
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.owner = syntheticOwner;
  let poll!: () => void;
  const initial = { ...automaticOff, enabled: true };
  const pending = deferred<Response>();
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return pending.promise;
      return response(
        url.endsWith("/v1/settings")
          ? { ...snapshot(), automatic: initial }
          : status,
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "Checkbox", "automatic_power").props.onChange(false),
    );
    let saving!: Promise<void>;
    await act(async () => {
      saving = field(view, "SubmitForm").props.onSubmit();
    });
    await act(async () =>
      field(view, "Dropdown", "automatic_interval").props.onChange("3600"),
    );
    await act(async () => {
      pending.resolve(
        response({ ...initial, only_on_power: false, revision: 1 }),
      );
      await saving;
    });
    await act(async () => poll());
    assert.equal(field(view, "Checkbox", "automatic_power").props.value, false);
    assert.equal(
      field(view, "Dropdown", "automatic_interval").props.value,
      "3600",
    );
    assert.equal(
      field(view, "SubmitForm").props.title,
      "Save Automatic Update Settings",
    );
    assert.equal(launcher.launches.length, launchesBefore);
    const activate = view.root.findAll(
      (node) =>
        String(node.type) === "Action" &&
        node.props.title === "Activate Background Checks",
    )[0];
    await act(async () => activate.props.onAction());
    assert.equal(launcher.launches.length, launchesBefore);
  } finally {
    launcher.owner = undefined;
    await act(async () => view?.unmount());
  }
});

test("pause and resume keep unapplied library edits and attach the launcher to continuation", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.owner = syntheticOwner;
  let poll!: () => void;
  let paused = false;
  let resumed: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        if (url.endsWith("/pause")) {
          paused = true;
          return response({ state: "indexing", pausing: true });
        }
        resumed = JSON.parse(String(init.body));
        paused = false;
        return response({ state: "indexing" });
      }
      return response(
        url.endsWith("/v1/settings")
          ? {
              ...snapshot(),
              job: { state: paused ? "paused" : "indexing" },
              automatic: {
                ...automaticOff,
                enabled: true,
                paused,
                revision: paused ? 1 : 0,
              },
            }
          : { ...status, indexing: !paused },
      );
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(createElement(ModelSettings));
    });
    await act(async () =>
      field(view, "Checkbox", "enable_documents").props.onChange(false),
    );
    const action = (title: string) =>
      view.root.findAll(
        (node) => String(node.type) === "Action" && node.props.title === title,
      )[0];
    await act(async () => action("Pause Indexing").props.onAction());
    await act(async () => poll());
    assert.equal(
      field(view, "Checkbox", "enable_documents").props.value,
      false,
    );
    await act(async () => action("Resume Indexing").props.onAction());
    assert.deepEqual(resumed?.launcher, syntheticOwner);
    assert.equal(
      field(view, "Checkbox", "enable_documents").props.value,
      false,
    );
  } finally {
    launcher.owner = undefined;
    await act(async () => view?.unmount());
  }
});

test("custom background checks read engine-owned preferences and start a short tick without installing the runtime", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.owner = syntheticOwner;
  environment.launchType = "background";
  const before = launcher.startupCalls;
  const huds = launcher.huds.length;
  const calls: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.endsWith("/tick")) {
        assert.deepEqual(
          JSON.parse(String(init?.body)).launcher,
          syntheticOwner,
        );
        return response({ ...automaticOff, enabled: true, state: "indexing" });
      }
      return response({ ...automaticOff, enabled: true });
    },
  );
  try {
    await AutomaticIndex();
    assert.deepEqual(calls, [
      "http://127.0.0.1:18799/v1/automatic",
      "http://127.0.0.1:18799/v1/automatic/tick",
    ]);
    assert.equal(launcher.startupCalls, before);
    assert.equal(launcher.huds.length, huds);
    assert.match(String(launcher.metadata.at(-1)?.subtitle), /background/);
  } finally {
    environment.launchType = "userInitiated";
    launcher.owner = undefined;
  }
});

test("paused custom background checks do not obtain an owner or schedule work", async (t) => {
  launcher.serviceURL = "http://127.0.0.1:18799";
  launcher.owner = undefined;
  environment.launchType = "background";
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return response({ ...automaticOff, enabled: true, paused: true });
  });
  try {
    await AutomaticIndex();
    assert.deepEqual(calls, ["http://127.0.0.1:18799/v1/automatic"]);
    assert.match(String(launcher.metadata.at(-1)?.subtitle), /Paused/);
  } finally {
    environment.launchType = "userInitiated";
  }
});
