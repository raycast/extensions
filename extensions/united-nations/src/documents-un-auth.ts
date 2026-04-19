import got from "got";

const DOCUMENTS_UN_ORIGIN = "https://documents.un.org";
const DOCUMENTS_UN_HOST = new URL(DOCUMENTS_UN_ORIGIN).host;
const DOCUMENTS_UN_MAIN_BUNDLE_PATTERN = /src="(\/static\/js\/main\.[^"]+\.js)"/;
const DOCUMENTS_UN_WASM_ASSET_PATTERN = /static\/media\/wasm_v_bg\.[\w-]+\.wasm/;
const DOCUMENTS_UN_TOKEN_GLUE_START = "let ii;function oi(";
const DOCUMENTS_UN_TOKEN_GLUE_END = ",Ai=e=>";

type DocumentsUnWindow = {
  location: { host: string };
  BigInt: typeof BigInt;
};

type DocumentsUnWebpackRequire = {
  (id: number): string;
  b: string;
};

type DocumentsUnGlobalScope = typeof globalThis & {
  Window?: new () => object;
  window?: DocumentsUnWindow;
  self?: DocumentsUnWindow;
  __webpack_require__?: DocumentsUnWebpackRequire;
};

type DocumentsUnAccessTokenGenerator = () => Promise<string>;
type DocumentsUnAccessTokenRuntime = {
  initialize: (input: ArrayBufferLike | ArrayBufferView) => Promise<unknown>;
  generate: DocumentsUnAccessTokenGenerator;
};

let documentsUnMainBundlePromise: Promise<string> | undefined;
let documentsUnWasmAssetPathPromise: Promise<string> | undefined;
let documentsUnAccessTokenGeneratorPromise: Promise<DocumentsUnAccessTokenGenerator> | undefined;
let cachedAccessToken: string | undefined;
let cachedAccessTokenMinute: string | undefined;

const getDocumentsUnMainBundle = async () => {
  if (!documentsUnMainBundlePromise) {
    documentsUnMainBundlePromise = (async () => {
      const homepage = await got(DOCUMENTS_UN_ORIGIN).text();
      const mainBundlePath = homepage.match(DOCUMENTS_UN_MAIN_BUNDLE_PATTERN)?.[1];

      if (!mainBundlePath) {
        throw new Error("Could not locate the documents.un.org main bundle");
      }

      const mainBundleUrl = new URL(mainBundlePath, DOCUMENTS_UN_ORIGIN).toString();
      return got(mainBundleUrl).text();
    })().catch((error) => {
      documentsUnMainBundlePromise = undefined;
      throw error;
    });
  }

  return documentsUnMainBundlePromise;
};

const getDocumentsUnWasmAssetPath = async () => {
  if (!documentsUnWasmAssetPathPromise) {
    documentsUnWasmAssetPathPromise = getDocumentsUnMainBundle()
      .then((mainBundle) => {
        const wasmAssetPath = mainBundle.match(DOCUMENTS_UN_WASM_ASSET_PATTERN)?.[0];

        if (!wasmAssetPath) {
          throw new Error("Could not locate the documents.un.org access token wasm asset");
        }

        return wasmAssetPath;
      })
      .catch((error) => {
        documentsUnWasmAssetPathPromise = undefined;
        throw error;
      });
  }

  return documentsUnWasmAssetPathPromise;
};

const getUtcMinuteKey = (date: Date) => {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ].join(":");
};

const getDocumentsUnAccessTokenGenerator = async () => {
  if (!documentsUnAccessTokenGeneratorPromise) {
    documentsUnAccessTokenGeneratorPromise = Promise.all([getDocumentsUnMainBundle(), getDocumentsUnWasmAssetPath()])
      .then(([mainBundle, wasmAssetPath]) => {
        const glueStart = mainBundle.indexOf(DOCUMENTS_UN_TOKEN_GLUE_START);
        const glueEnd = mainBundle.indexOf(DOCUMENTS_UN_TOKEN_GLUE_END, glueStart);

        if (glueStart === -1 || glueEnd === -1) {
          throw new Error("Could not locate the documents.un.org access token generator");
        }

        const glue = mainBundle.slice(glueStart, glueEnd);
        const wrappedGenerator = `(() => { ${glue}; return { initialize: wi, generate: Ei }; })()`;

        class DocumentsUnWindowImpl {}

        const globalScope = globalThis as DocumentsUnGlobalScope;
        const windowObject = new DocumentsUnWindowImpl() as DocumentsUnWindow;
        windowObject.location = { host: DOCUMENTS_UN_HOST };
        windowObject.BigInt = BigInt;

        const webpackRequire = ((id: number) => {
          if (id === 9129) {
            return wasmAssetPath;
          }

          throw new Error(`Unexpected documents.un.org module id: ${id}`);
        }) as DocumentsUnWebpackRequire;

        webpackRequire.b = `${DOCUMENTS_UN_ORIGIN}/`;

        globalScope.Window = DocumentsUnWindowImpl;
        globalScope.window = windowObject;
        globalScope.self = windowObject;
        globalScope.__webpack_require__ = webpackRequire;

        return got(new URL(wasmAssetPath, DOCUMENTS_UN_ORIGIN).toString())
          .buffer()
          .then(async (wasmSource) => {
            const runtime = eval(wrappedGenerator) as DocumentsUnAccessTokenRuntime;
            await runtime.initialize({ module_or_path: wasmSource } as unknown as ArrayBufferView);
            return runtime.generate;
          });
      })
      .catch((error) => {
        documentsUnAccessTokenGeneratorPromise = undefined;
        throw error;
      });
  }

  return documentsUnAccessTokenGeneratorPromise;
};

export const getDocumentsUnAccessToken = async () => {
  const minuteKey = getUtcMinuteKey(new Date());

  if (cachedAccessToken && cachedAccessTokenMinute === minuteKey) {
    return cachedAccessToken;
  }

  const generateAccessToken = await getDocumentsUnAccessTokenGenerator();
  const accessToken = await generateAccessToken();

  cachedAccessToken = accessToken;
  cachedAccessTokenMinute = minuteKey;

  return accessToken;
};

export const getDocumentsUnAuthorizationHeader = async () => {
  return `Access ${await getDocumentsUnAccessToken()}`;
};
