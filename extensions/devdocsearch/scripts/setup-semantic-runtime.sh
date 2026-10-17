#!/usr/bin/env bash
set -euo pipefail

SEMANTIC_VENV="$HOME/.context/docsearch-venv"
uv venv --python 3.12 "$SEMANTIC_VENV"
uv pip install --python "$SEMANTIC_VENV/bin/python" 'numpy>=2,<3' 'faiss-cpu>=1.15,<2'
echo "Semantic indexing runtime ready at $SEMANTIC_VENV"
