import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import { after, mock, test } from "node:test";
import ts from "typescript";
import { Resend } from "resend";

const nativeRequire = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "resend-positions-"));
const resumePath = path.join(directory, "resume.pdf");
fs.writeFileSync(resumePath, "%PDF-1.4 resume");
after(() => fs.rmSync(directory, { recursive: true, force: true }));

function loadSource(relativePath, mocks, cache = new Map()) {
  const filename = path.join(root, relativePath);
  if (cache.has(filename)) return cache.get(filename);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("."))
      return loadSource(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`)), mocks, cache);
    return nativeRequire(name);
  };
  compileFunction(outputText, ["require", "module", "exports"], { filename })(requireMock, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

function fixture(fields = []) {
  const position = { id: "job-123", title: "Engineer", location: "Americas", fields };
  const sdk = {
    get: mock.fn(async (route) => ({
      data: route === "/careers" ? { object: "list", data: [position] } : position,
      error: null,
    })),
    post: mock.fn(async () => ({ data: { success: true }, error: null })),
  };
  const oauth = { getResend: () => sdk, withResend: (value) => value };
  const mocks = { "./oauth": oauth, "../lib/oauth": oauth, "./lib/oauth": oauth };
  const api = loadSource("src/lib/positions.ts", mocks);
  const input = { positionId: position.id, name: "Ada", email: "ada@example.com", resumePath, answers: [] };
  return { position, sdk, api, input, mocks };
}

const question = (overrides = {}) => ({
  path: "question-uuid",
  title: "Why Resend?",
  type: "LongText",
  required: true,
  ...overrides,
});

test("lists, retrieves, escapes IDs, and preserves list errors", async () => {
  const { sdk, api, position } = fixture();
  assert.equal((await api.listPositions()).data[0], position);
  await api.retrievePosition("job/123");
  assert.equal(sdk.get.mock.calls[1].arguments[0], "/careers/job%2F123");
  sdk.get.mock.mockImplementation(async () => ({
    data: null,
    error: { name: "auth_error", statusCode: 403, message: "Forbidden" },
  }));
  await assert.rejects(api.listPositions(), /API key in extension preferences/);
});

test("empty list is returned unchanged", async () => {
  const { sdk, api } = fixture();
  sdk.get.mock.mockImplementation(async () => ({ data: { object: "list", data: [] }, error: null }));
  assert.deepEqual((await api.listPositions()).data, []);
});

test("multipart contains one resume and exact UUID answer paths", async () => {
  const { api, input, sdk } = fixture([question(), question({ path: "consent", type: "Boolean" })]);
  input.answers = [
    { path: "question-uuid", value: "I build email tools" },
    { path: "consent", value: "false" },
  ];
  assert.equal((await api.applyToPosition(input)).success, true);
  assert.equal(sdk.post.mock.callCount(), 1);
  const [route, form] = sdk.post.mock.calls[0].arguments;
  assert.equal(route, "/careers/job-123");
  assert.equal(form.get("name"), "Ada");
  assert.equal(form.get("email"), input.email);
  assert.equal(form.get("question-uuid"), "I build email tools");
  assert.equal(form.get("consent"), "false");
  assert.equal(form.getAll("resume").length, 1);
  assert.equal(form.get("resume").name, "resume.pdf");
  assert.equal(form.get("resume").type, "application/pdf");
  assert.equal(await form.get("resume").text(), "%PDF-1.4 resume");
});

test("rejects missing, duplicate, unknown, and reserved answers before upload", async () => {
  const { api, input, sdk } = fixture([question()]);
  for (const answers of [
    [],
    [{ path: "unknown", value: "x" }],
    [{ path: "name", value: "other" }],
    [
      { path: "question-uuid", value: "x" },
      { path: "question-uuid", value: "y" },
    ],
  ]) {
    await assert.rejects(api.applyToPosition({ ...input, answers }));
  }
  assert.equal(sdk.post.mock.callCount(), 0);
});

test("validates boolean, number, email, and selectable answers", () => {
  for (const [type, invalid, valid] of [
    ["Boolean", "yes", "false"],
    ["Number", "Infinity", "42"],
    ["Email", "wrong", "ada@example.com"],
  ]) {
    const { api, input, position } = fixture([question({ type })]);
    assert.throws(() =>
      api.validateApplication(position, { ...input, answers: [{ path: "question-uuid", value: invalid }] }),
    );
    assert.doesNotThrow(() =>
      api.validateApplication(position, { ...input, answers: [{ path: "question-uuid", value: valid }] }),
    );
  }
  const { api, input, position } = fixture([
    question({ selectable_values: [{ label: "Remote", value: "remote-id" }] }),
  ]);
  assert.throws(() =>
    api.validateApplication(position, { ...input, answers: [{ path: "question-uuid", value: "Remote" }] }),
  );
  assert.doesNotThrow(() =>
    api.validateApplication(position, { ...input, answers: [{ path: "question-uuid", value: "remote-id" }] }),
  );
});

test("unknown required fields block submission; optional unsupported answers are never discarded", () => {
  for (const type of ["File", "FutureField"]) {
    const { api, input, position } = fixture([question({ type })]);
    assert.throws(() => api.validateApplication(position, input), /careers website/);
    position.fields[0].required = false;
    assert.doesNotThrow(() => api.validateApplication(position, input));
    assert.throws(
      () => api.validateApplication(position, { ...input, answers: [{ path: "question-uuid", value: "data" }] }),
      /careers website/,
    );
  }
});

test("invalid identity and resume files cause no POST", async () => {
  const { api, input, sdk } = fixture();
  const empty = path.join(directory, "empty.pdf");
  const large = path.join(directory, "large.pdf");
  fs.writeFileSync(empty, "");
  fs.writeFileSync(large, "x");
  fs.truncateSync(large, 10 * 1024 * 1024 + 1);
  for (const patch of [
    { name: " " },
    { email: "invalid" },
    { resumePath: "relative.pdf" },
    { resumePath: directory },
    { resumePath: empty },
    { resumePath: large },
    { resumePath: path.join(directory, "missing.pdf") },
  ]) {
    await assert.rejects(api.applyToPosition({ ...input, ...patch }));
  }
  assert.equal(sdk.post.mock.callCount(), 0);
});

test("resume errors explain unsupported formats, empty files, and oversized files", async () => {
  const { api, input, sdk } = fixture();
  const invalid = path.join(directory, "resume.png");
  fs.writeFileSync(invalid, "image");
  await assert.rejects(
    api.applyToPosition({ ...input, resumePath: invalid }),
    /Unsupported resume format \(\.png\).*PDF, DOC, DOCX, or TXT/,
  );
  fs.truncateSync(invalid, 11 * 1024 * 1024);
  await assert.rejects(api.applyToPosition({ ...input, resumePath: invalid }), (error) => {
    assert.match(error.message, /Unsupported resume format/);
    assert.match(error.message, /too large \(11.00 MB\)/);
    assert.match(error.message, /maximum is 10 MB/);
    return true;
  });
  const empty = path.join(directory, "empty-resume.pdf");
  fs.writeFileSync(empty, "");
  await assert.rejects(api.validateResume(empty), /resume is empty/);
  assert.equal(sdk.post.mock.callCount(), 0);
});

test("supported resume extensions accept uppercase names and the exact size limit", async () => {
  const { api } = fixture();
  for (const extension of ["PDF", "doc", "docx", "txt"]) {
    const file = path.join(directory, `valid.${extension}`);
    fs.writeFileSync(file, "resume");
    await api.validateResume(file);
  }
  const limit = path.join(directory, "limit.pdf");
  fs.writeFileSync(limit, "x");
  fs.truncateSync(limit, 10 * 1024 * 1024);
  await api.validateResume(limit);
});

test("API errors retain Resend details and explain upload and rate limits", async () => {
  const { api, input, sdk } = fixture();
  for (const [statusCode, message, hint] of [
    [413, "Payload too large", /smaller resume file/],
    [429, "Rate limit exceeded", /Wait before trying again/],
  ]) {
    sdk.post.mock.mockImplementation(async () => ({
      data: null,
      error: { name: "application_error", statusCode, message },
    }));
    await assert.rejects(api.applyToPosition(input), (error) => {
      assert.ok(error.message.startsWith(message));
      assert.match(error.message, hint);
      return true;
    });
  }
});

test("duplicate and uncertain responses are not retried", async () => {
  const { api, input, sdk } = fixture();
  sdk.post.mock.mockImplementation(async () => ({
    data: null,
    error: { name: "validation_error", statusCode: 400, message: "An application has already been submitted" },
  }));
  await assert.rejects(api.applyToPosition(input), /already been submitted/);
  assert.equal(sdk.post.mock.callCount(), 1);
  sdk.post.mock.mockImplementation(async () => ({
    data: null,
    error: { name: "application_error", statusCode: null, message: "Network error" },
  }));
  await assert.rejects(api.applyToPosition(input), /Network error.*may have been accepted/);
  assert.equal(sdk.post.mock.callCount(), 2);
  sdk.post.mock.mockImplementation(async () => ({ data: { success: false }, error: null }));
  await assert.rejects(api.applyToPosition(input), /did not confirm/);
});

test("real SDK supplies auth and multipart boundary without JSON content type", async () => {
  const sdk = new Resend("re_mock_key");
  const oauth = { getResend: () => sdk };
  const api = loadSource("src/lib/positions.ts", { "./oauth": oauth });
  const { position, input } = fixture();
  let request;
  const fetchMock = mock.method(globalThis, "fetch", async (url, options) => {
    if (options.method === "GET") return Response.json(position);
    request = new Request(url, options);
    return Response.json({ success: true });
  });
  try {
    await api.applyToPosition(input);
    assert.equal(request.headers.get("authorization"), "Bearer re_mock_key");
    assert.match(request.headers.get("content-type"), /^multipart\/form-data; boundary=/);
    assert.equal((await request.formData()).get("resume").name, "resume.pdf");
  } finally {
    fetchMock.mock.restore();
  }
});

test("AI confirmation resolves real labels and performs no upload or file read", async () => {
  const { input, mocks, api, sdk } = fixture([question({ type: "Boolean" })]);
  input.answers = [{ path: "question-uuid", value: "false" }];
  const tool = loadSource("src/tools/apply-to-position.ts", { ...mocks, "../lib/positions": api });
  const fsRead = mock.method(fs.promises, "readFile", async () => {
    throw new Error("Confirmation must not read a resume");
  });
  try {
    const confirmation = await tool.confirmation(input);
    assert.equal(confirmation.info.find((item) => item.name === "Position").value, "Engineer");
    assert.equal(confirmation.info.find((item) => item.name === "Why Resend?").value, "No");
    assert.equal(sdk.post.mock.callCount(), 0);
  } finally {
    fsRead.mock.restore();
  }
});

function find(node, title) {
  if (!node) return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, title)).find(Boolean);
  if (node.props?.title === title) return node.props;
  return find(node.props?.children, title) || find(node.props?.actions, title);
}

function uiFixture(fields = [], positions) {
  const f = fixture(fields);
  let states = [],
    refs = [],
    stateIndex = 0,
    refIndex = 0;
  const navigation = [];
  const failure = mock.fn(async () => {});
  const jsx = (type, props) => ({ type, props });
  const ui = (name) => new Proxy(function () {}, { get: (_, key) => `${name}.${String(key)}` });
  const mocks = {
    ...f.mocks,
    "./lib/positions": f.api,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            states[index] = typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
      useRef: (initial) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    },
    "@raycast/api": {
      Action: ui("Action"),
      ActionPanel: ui("ActionPanel"),
      Detail: ui("Detail"),
      Form: ui("Form"),
      List: ui("List"),
      Icon: {},
      Toast: { Style: { Success: "success" } },
      showToast: async () => {},
      useNavigation: () => ({ push: (element) => navigation.push(element) }),
    },
    "@raycast/utils": {
      useCachedPromise: (fn) => ({
        data: fn.name === "listPositions" ? { data: positions ?? [f.position] } : f.position,
        isLoading: false,
        revalidate: async () => {},
      }),
      showFailureToast: failure,
    },
  };
  const command = loadSource("src/careers.tsx", mocks).default;
  function render(element) {
    stateIndex = 0;
    refIndex = 0;
    return element.type(element.props);
  }
  function mount(element, initial = []) {
    states = initial;
    refs = [];
    return render(element);
  }
  const list = command();
  const application = find(list, "Apply to Job").target;
  const form = mount(application);
  return { ...f, navigation, failure, formElement: form, commandElement: { type: command }, mount, render };
}

test("Careers filters Americas and Europe and restores all positions", () => {
  const positions = [
    { id: "us", title: "American Role", location: "Americas" },
    { id: "eu", title: "European Role", location: "Europe" },
    { id: "unknown", title: "Unspecified Role", location: null },
  ];
  const f = uiFixture([], positions);
  let list = f.mount(f.commandElement);
  const titles = () => list.props.children.map((item) => item.props.title);
  assert.deepEqual(
    titles(),
    positions.map((position) => position.title),
  );
  assert.equal(list.props.searchBarAccessory.props.value, "all");
  list.props.searchBarAccessory.props.onChange("americas");
  list = f.render(f.commandElement);
  assert.deepEqual(titles(), ["American Role"]);
  list.props.searchBarAccessory.props.onChange("europe");
  list = f.render(f.commandElement);
  assert.deepEqual(titles(), ["European Role"]);
  list.props.searchBarAccessory.props.onChange("all");
  list = f.render(f.commandElement);
  assert.deepEqual(
    titles(),
    positions.map((position) => position.title),
  );
});

test("Careers shows a region-specific empty state when no positions match", () => {
  const f = uiFixture();
  const list = f.mount(f.commandElement);
  list.props.searchBarAccessory.props.onChange("europe");
  const empty = find(f.render(f.commandElement), "No Open Positions");
  assert.equal(empty.description, "No open positions in Europe.");
  assert.ok(find(empty.actions, "Reload"));
});

test("action menu opens form; review/cancel sends nothing, final submit sends once", async () => {
  const f = uiFixture();
  let form = f.mount(f.formElement);
  find(form, "Name").onChange("Ada");
  find(form, "Email").onChange("ada@example.com");
  find(form, "Resume").onChange([resumePath]);
  form = f.render(f.formElement);
  await find(form, "Review Application").onSubmit();
  assert.equal(f.failure.mock.callCount(), 0);
  assert.equal(f.sdk.post.mock.callCount(), 0);
  assert.equal(f.navigation.length, 1);
  const reviewElement = f.navigation[0];
  let review = f.mount(reviewElement);
  assert.match(review.props.markdown, /Ada/);
  const submit = find(review, "Submit Application").onAction;
  await Promise.all([submit(), submit()]);
  assert.equal(f.sdk.post.mock.callCount(), 1);
  review = f.render(reviewElement);
  assert.equal(find(review, "Submit Application"), undefined);
  assert.match(review.props.markdown, /Application submitted/);
});

test("required Boolean has no default, unsupported required field offers browser fallback", () => {
  const f = uiFixture([question({ type: "Boolean" })]);
  const form = f.mount(f.formElement);
  const fieldElement = form.props.children
    .flat()
    .flatMap((element) => element?.props?.children ?? element)
    .find((element) => element?.props?.field);
  const dropdown = fieldElement.type(fieldElement.props);
  assert.equal(dropdown.props.value, "");
  assert.equal(dropdown.props.children[0].props.value, "");
  const unsupported = uiFixture([question({ type: "File" })]);
  const blockedForm = unsupported.mount(unsupported.formElement);
  assert.equal(find(blockedForm, "Review Application"), undefined);
  assert.ok(find(blockedForm, "Apply in Browser"));
});

test("long application questions stay in description text instead of field labels", () => {
  const title = "Tell us about a time you built something new or things went wrong and how you handled the situation?";
  const description = "Include the outcome and what you learned.";
  for (const type of ["LongText", "Boolean", "Location", "File"]) {
    const f = uiFixture([question({ title, description, type })]);
    const form = f.mount(f.formElement);
    const group = form.props.children
      .flat()
      .find((element) => element?.props?.children?.some?.((child) => child?.props?.field));
    const prompt = find(group, "Question 1");
    assert.equal(prompt.text, `${title}\n\n${description}`);
    const field = group.props.children.find((element) => element?.props?.field);
    const control = field.type(field.props);
    assert.equal(control.props.title, "Answer *");
    if (type === "Boolean") {
      control.props.onChange("false");
      assert.equal(
        f
          .render(f.formElement)
          .props.children.flat()
          .find((element) => element?.props?.children?.some?.((child) => child?.props?.field)).props.children[1].props
          .value,
        "false",
      );
    }
  }
});

test("questions 6 through 8 use single-line inputs and retain their answers", () => {
  const f = uiFixture(Array.from({ length: 9 }, (_, index) => question({ path: `question-${index + 1}` })));
  const controls = (form) =>
    form.props.children
      .flat()
      .flatMap((element) => element?.props?.children ?? element)
      .filter((element) => element?.props?.field)
      .map((element) => element.type(element.props));
  const inputs = controls(f.mount(f.formElement));
  assert.equal(inputs.length, 9);
  inputs.forEach((input, index) => {
    assert.equal(input.type, index >= 5 && index <= 7 ? "Form.TextField" : "Form.TextArea");
    input.props.onChange(`Answer ${index + 1}`);
  });
  controls(f.render(f.formElement)).forEach((input, index) => {
    assert.equal(input.props.value, `Answer ${index + 1}`);
  });
});

test("confirmation authenticates before retrieving application questions", async () => {
  const f = fixture();
  let authenticated = false;
  const positions = {
    ...f.api,
    retrievePosition: async () => {
      assert.equal(authenticated, true);
      return f.position;
    },
  };
  const tool = loadSource("src/tools/apply-to-position.ts", {
    "../lib/positions": positions,
    "../lib/oauth": {
      withResend: (fn) => async (input) => {
        authenticated = true;
        return fn(input);
      },
    },
  });
  await tool.confirmation(f.input);
  assert.equal(f.sdk.post.mock.callCount(), 0);
});

test("submission errors preserve review without success and permit an explicit retry", async () => {
  const f = uiFixture();
  let form = f.mount(f.formElement);
  find(form, "Name").onChange("Ada");
  find(form, "Email").onChange("ada@example.com");
  find(form, "Resume").onChange([resumePath]);
  form = f.render(f.formElement);
  await find(form, "Review Application").onSubmit();
  const element = f.navigation[0];
  const review = f.mount(element);
  f.sdk.post.mock.mockImplementation(async () => ({
    data: null,
    error: { statusCode: 400, name: "validation_error", message: "Position closed" },
  }));
  await find(review, "Submit Application").onAction();
  assert.equal(f.failure.mock.callCount(), 1);
  const failed = f.render(element);
  assert.ok(find(failed, "Submit Application"));
  assert.match(failed.props.markdown, /Ada/);
  assert.doesNotMatch(failed.props.markdown, /Application submitted/);
  assert.equal(f.sdk.post.mock.callCount(), 1);
});

test("browsing positions does not require sender preferences; applying still requires identity", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  for (const name of ["sender_name", "sender_email"]) {
    assert.equal(manifest.preferences.find((preference) => preference.name === name).required, false);
  }
  const f = uiFixture();
  assert.ok(f.formElement);
  assert.throws(() => f.api.validateApplication(f.position, { ...f.input, name: "" }), /Name is required/);
  assert.throws(() => f.api.validateApplication(f.position, { ...f.input, email: "" }), /valid applicant email/);
});

test("email sending without sender preferences requires an explicit sender", async () => {
  const f = fixture();
  const send = mock.fn(async () => ({ data: { id: "sent-1" }, error: null }));
  f.sdk.emails = { send };
  const input = { to: ["test@example.com"], subject: "Hello", text: "Hello" };
  const tool = loadSource("src/tools/send-email.ts", {
    ...f.mocks,
    "@raycast/api": { getPreferenceValues: () => ({}) },
  });
  await assert.rejects(tool.confirmation(input), /Provide a sender address/);
  await assert.rejects(tool.default(input), /Provide a sender address/);
  assert.equal(send.mock.callCount(), 0);
  const explicit = { ...input, from: "ada@example.com" };
  assert.equal((await tool.confirmation(explicit)).info[0].value, explicit.from);
  await tool.default(explicit);
  assert.equal(send.mock.calls[0].arguments[0].from, explicit.from);
});

test("sender email without an optional display name is a valid default", async () => {
  const f = fixture();
  const send = mock.fn(async () => ({ data: { id: "sent-1" }, error: null }));
  f.sdk.emails = { send };
  const tool = loadSource("src/tools/send-email.ts", {
    ...f.mocks,
    "@raycast/api": { getPreferenceValues: () => ({ sender_email: "ada@example.com" }) },
  });
  const input = { to: ["test@example.com"], subject: "Hello", text: "Hello" };
  assert.equal((await tool.confirmation(input)).info[0].value, "ada@example.com");
  await tool.default(input);
  assert.equal(send.mock.calls[0].arguments[0].from, "ada@example.com");
});
