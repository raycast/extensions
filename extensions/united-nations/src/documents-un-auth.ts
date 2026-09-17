import { runInNewContext } from "node:vm";
import got from "got";

const DOCUMENTS_UN_ORIGIN = "https://documents.un.org";
const DOCUMENTS_UN_MAIN_BUNDLE_PATTERN = /src="(\/static\/js\/main\.[^"]+\.js)"/;
const DOCUMENTS_UN_WASM_ASSET_PATTERN = /\/?static\/(?:media\/)?wasm_v_bg(?:\.[\w-]+)?\.wasm/;
// Match wasm-bindgen's structure, since every deployment can rename its local variables.
const DOCUMENTS_UN_GLUE_START_PATTERN =
  /let ([\w$]+);function [\w$]+\(\w+\)\{const \w+=\1\.__externref_table_alloc\(\)/;
const DOCUMENTS_UN_GLUE_END_PATTERN = /const [\w$]+=([\w$]+),[\w$]+=async\(\)=>\{/;

type DocumentsUnWasmExports = {
  check: (year: bigint, month: bigint, day: bigint, hour: bigint, minute: bigint) => bigint;
};

let documentsUnRuntimePromise: Promise<DocumentsUnWasmExports> | undefined;
let cachedAccessToken: string | undefined;
let cachedAccessTokenMinute: string | undefined;

const getDocumentsUnRuntime = async () => {
  if (!documentsUnRuntimePromise) {
    documentsUnRuntimePromise = (async () => {
      const homepage = await got(DOCUMENTS_UN_ORIGIN).text();
      const mainBundlePath = homepage.match(DOCUMENTS_UN_MAIN_BUNDLE_PATTERN)?.[1];

      if (!mainBundlePath) {
        throw new Error("Could not locate the documents.un.org main bundle");
      }

      const mainBundle = await got(new URL(mainBundlePath, DOCUMENTS_UN_ORIGIN)).text();
      const wasmAssetPath = mainBundle.match(DOCUMENTS_UN_WASM_ASSET_PATTERN)?.[0];
      if (!wasmAssetPath) {
        throw new Error("Could not locate the documents.un.org access token wasm asset");
      }

      const glueStart = mainBundle.match(DOCUMENTS_UN_GLUE_START_PATTERN)?.index;
      const remainingBundle = glueStart === undefined ? "" : mainBundle.slice(glueStart);
      const glueEnd = remainingBundle.match(DOCUMENTS_UN_GLUE_END_PATTERN);
      if (!glueEnd || glueEnd.index === undefined) {
        throw new Error("Could not locate the documents.un.org access token generator");
      }

      const glue = remainingBundle.slice(0, glueEnd.index);
      const wasmSource = await got(new URL(wasmAssetPath, DOCUMENTS_UN_ORIGIN)).buffer();

      class DocumentsUnWindow {
        location = { host: new URL(DOCUMENTS_UN_ORIGIN).host };
      }
      const window = new DocumentsUnWindow();
      // Keep the site's browser globals out of the Raycast process's global scope.
      return runInNewContext(
        `(() => { ${glue}; return ${glueEnd[1]}({ module_or_path: wasmSource }); })()`,
        { Window: DocumentsUnWindow, window, self: window, TextEncoder, TextDecoder, URL, wasmSource },
        { timeout: 1000 },
      ) as Promise<DocumentsUnWasmExports>;
    })().catch((error) => {
      documentsUnRuntimePromise = undefined;
      throw error;
    });
  }

  return documentsUnRuntimePromise;
};

export const getDocumentsUnAccessToken = async () => {
  const runtime = await getDocumentsUnRuntime();
  const date = new Date();
  const dateParts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ] as const;
  const minuteKey = dateParts.join(":");

  if (cachedAccessToken && cachedAccessTokenMinute === minuteKey) {
    return cachedAccessToken;
  }

  const [year, month, day, hour, minute] = dateParts.map(BigInt);
  const accessToken = String(runtime.check(year, month, day, hour, minute));
  cachedAccessToken = accessToken;
  cachedAccessTokenMinute = minuteKey;
  return accessToken;
};

export const getDocumentsUnAuthorizationHeader = async () => {
  return `Access ${await getDocumentsUnAccessToken()}`;
};
