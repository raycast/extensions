# Semantic search setup

Keyword search needs no extra setup. Semantic search requires a Python runtime, including when you use a remote embedding endpoint. These commands work from any folder; the extension source is not required.

## Python runtime

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if it is not already installed. Then run these commands in Terminal:

```bash
uv venv --python 3.12 "$HOME/.context/docsearch-venv"
uv pip install --python "$HOME/.context/docsearch-venv/bin/python" 'numpy>=2,<3' 'faiss-cpu>=1.15,<2'
```

The runtime is stored in `~/.context/docsearch-venv`. If you already have this runtime, skip the `uv venv` command.

## Another device or cloud

After installing the Python runtime, open **Download Docs**, select **Embedding Settings**, and choose **Another device or cloud**. Enter your endpoint, embedding model ID, and optional API key, then save. Select **Build Vector Indexes** to approve sending saved passages to that endpoint. Your provider may charge for indexing. Search queries also go to the selected endpoint.

## This Mac

Local MLX embeddings require an Apple silicon Mac. After installing the Python runtime, run:

```bash
uv pip install --python "$HOME/.context/docsearch-venv/bin/python" \
  'mlx>=0.31,<0.32' 'mlx-lm>=0.31,<0.32' 'transformers>=5.5,<6' \
  'huggingface_hub>=1.11,<2' \
  'pplx-mlx-convert @ git+https://github.com/thehumanworks/pplx-mlx.git@332b845d2d49934586bc8f9a046455ff48502845#subdirectory=packages/pplx-mlx-convert'

HF_HOME="$HOME/.context/docsearch-models" "$HOME/.context/docsearch-venv/bin/python" - <<'PYTHON'
from huggingface_hub import snapshot_download
from pplx_mlx_convert.embeddings import load_embedder

path = snapshot_download(
    "agentmish/pplx-embed-v1-0.6b-mlx",
    revision="edc2b94227d1e4b8e185c1cf6db7d20d6759879b",
    allow_patterns=["*.json", "*.safetensors", "*.txt", "*.py", "pplx_mlx_convert/*.py"],
)
model = load_embedder(path)
print("Local embedding model ready:", model.encode(["Search documentation"], quantization="int8").shape)
PYTHON
```

This downloads the embedding model into `~/.context/docsearch-models` and runs a test embedding. It requires network access and disk space for the model.

Return to **Download Docs**, open **Embedding Settings**, choose **This Mac**, and save. Select **Build Vector Indexes**. Progress appears in Download Docs, where indexing can be paused and resumed. Keyword search remains available during setup and indexing.
