// Release sources: github.com/sushilk1991/raycast-local-search; both models are revision-pinned.
export const HELPER_VERSION = "0.2.1";
export const HELPER = {
  url: `https://github.com/sushilk1991/raycast-local-search/releases/download/v${HELPER_VERSION}/local-search-helper-${HELPER_VERSION}-darwin-arm64.tar.gz`,
  bytes: 40610575,
  sha256: "4c406e8279fd0c3aa4c460c59f771f84dcfb28f2c01532fb1958b952cbaac346",
};
const MODEL_REVISION = "bfcd298762cc34d0357ece5ebdd31791a3a374d8";
const MODEL_BASE = `https://huggingface.co/ggml-org/embeddinggemma-2-GGUF/resolve/${MODEL_REVISION}`;
export const MODELS = [
  {
    name: "embeddinggemma-2-Q8_0.gguf",
    url: `${MODEL_BASE}/embeddinggemma-2-Q8_0.gguf`,
    bytes: 309855456,
    sha256: "2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135",
  },
  {
    name: "mmproj-embeddinggemma-2-Q8_0.gguf",
    url: `${MODEL_BASE}/mmproj-embeddinggemma-2-Q8_0.gguf`,
    bytes: 554821024,
    sha256: "c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f",
  },
];
