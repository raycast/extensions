#!/usr/bin/env bash
set -euo pipefail

SEMANTIC_VENV="$HOME/.context/docsearch-venv"
export HF_HOME="$HOME/.context/docsearch-models"
"$(dirname "$0")/setup-semantic-runtime.sh"
uv pip install --python "$SEMANTIC_VENV/bin/python" \
  'mlx>=0.31,<0.32' 'mlx-lm>=0.31,<0.32' 'transformers>=5.5,<6' \
  'huggingface_hub>=1.11,<2' \
  'pplx-mlx-convert @ git+https://github.com/thehumanworks/pplx-mlx.git@332b845d2d49934586bc8f9a046455ff48502845#subdirectory=packages/pplx-mlx-convert'

"$SEMANTIC_VENV/bin/python" - <<'PY'
from huggingface_hub import snapshot_download
from pplx_mlx_convert.embeddings import load_embedder

path = snapshot_download(
    "agentmish/pplx-embed-v1-0.6b-mlx",
    revision="edc2b94227d1e4b8e185c1cf6db7d20d6759879b",
    allow_patterns=["*.json", "*.safetensors", "*.txt", "*.py", "pplx_mlx_convert/*.py"],
)
model = load_embedder(path)
print("Local Perplexity embedding model ready:", model.encode(["Search documentation"], quantization="int8").shape)
PY
