# This file is derived from PasteGuard and is redistributed under the Apache
# License 2.0. See assets/detector-patch/LICENSE for the licence text.
#
#   Source:   https://github.com/sgasser/pasteguard
#   File:     detector/detector/gliner_layer.py
#   Revision: 88c206c725ae0b01a5e515109c6e153168713e07 (v0.9.2)
#   Copyright 2026 Stefan Gasser
#
# Modified by the Caviarde authors. The changes from the original, in full:
#   - added an "organization" entry to PER_LABEL_FLOOR, with a floor of 0.50
#   - added "organization" to _TUNABLE
#   - added "organization": "ORGANIZATION" to _LABEL_TO_TYPE
# The docstring below is the original and still describes three labels.

"""Fuzzy layer: multilingual GLiNER NER for person, location, and address
(addresses are emitted as LOCATION).

Each label has its own confidence floor (PER_LABEL_FLOOR). The request
`score_threshold` only raises the tunable labels (person, location, address).
"""

from __future__ import annotations

import os
import re
import threading
from functools import lru_cache
from math import isfinite
from typing import Any

from .entities import LOCATION, PERSON, Span

# Size of the LRU cache, in units of WINDOW_SIZE input to the model
MODEL_INFERENCE_CACHE_SIZE = 4096

DEFAULT_MODEL = "urchade/gliner_multi_pii-v1"


def _env(name: str, legacy_name: str | None = None) -> tuple[str | None, str]:
    value = os.environ.get(name)
    if value is not None:
        return value, name
    if legacy_name is not None:
        legacy_value = os.environ.get(legacy_name)
        if legacy_value is not None:
            return legacy_value, legacy_name
    return None, name


def _floor(label: str, default: float) -> float:
    name = f"GLINER_FLOOR_{label.upper()}"
    value, source_name = _env(name, f"DETECTOR_FLOOR_{label.upper()}")
    if value is None:
        return default
    try:
        parsed = float(value)
    except ValueError:
        raise ValueError(f"{source_name} must be a number between 0 and 1; got {value!r}") from None
    if not isfinite(parsed) or not 0.0 <= parsed <= 1.0:
        raise ValueError(f"{source_name} must be a number between 0 and 1; got {value!r}")
    return parsed


def _max_tokens(default: int = 384) -> int:
    name = "GLINER_MAX_TOKENS"
    value, source_name = _env(name, "DETECTOR_MAX_TOKENS")
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        raise ValueError(
            f"{source_name} must be an integer of at least 64; got {value!r}"
        ) from None
    if parsed < 64:
        raise ValueError(f"{source_name} must be an integer of at least 64; got {value!r}")
    return parsed


# Per-label confidence floors (calibrated against the accuracy benchmark;
# overridable via env, e.g. GLINER_FLOOR_LOCATION=0.6).
PER_LABEL_FLOOR = {
    "person": _floor("person", 0.99),
    "location": _floor("location", 0.80),
    # A dedicated "address" label recovers full street addresses that a bare
    # "location" reading misses; emitted as LOCATION (see _LABEL_TO_TYPE).
    "address": _floor("address", 0.80),
    "organization": _floor("organization", 0.50),
}
# Labels the request `score_threshold` may raise (high-volume, deployment-tunable).
_TUNABLE = {"person", "location", "address", "organization"}

_LABELS = list(PER_LABEL_FLOOR)
_LABEL_TO_TYPE = {
    "person": PERSON,
    "location": LOCATION,
    # Street addresses are a kind of location for masking purposes; emit them as
    # LOCATION so the response entity set stays the Presidio drop-in set.
    "address": LOCATION,
    "organization": "ORGANIZATION",
}
# Capture candidates below every floor so per-label filtering has them.
_PREDICT_FLOOR = min(PER_LABEL_FLOOR.values()) - 0.1

# GLiNER truncates input past its word-token limit (~384), so long text would
# drop PII past the cut. Split into overlapping windows; the splitter mirrors
# GLiNER's WhitespaceTokenSplitter so window sizes match.
_TOKEN_RE = re.compile(r"\w+(?:[-_]\w+)*|\S")
_MAX_TOKENS = _max_tokens()
_WINDOW = max(64, _MAX_TOKENS - 64)  # headroom under the hard limit
_OVERLAP = 64  # >= longest expected entity, so boundary-straddling spans survive


def _windows(text: str):
    """Yield (char_offset, subtext) windows. One window for short text; for long
    text, overlapping windows of <= _WINDOW word-tokens."""
    toks = [(m.start(), m.end()) for m in _TOKEN_RE.finditer(text)]
    if len(toks) <= _MAX_TOKENS:
        yield 0, text
        return
    step = max(1, _WINDOW - _OVERLAP)
    i = 0
    while i < len(toks):
        window = toks[i : i + _WINDOW]
        cstart, cend = window[0][0], window[-1][1]
        yield cstart, text[cstart:cend]
        if i + _WINDOW >= len(toks):
            break
        i += step


# GLiNER ships no type stubs, so the loaded model is untyped (Any).
_model: Any = None
_loaded_model_name: str | None = None
_lock = threading.Lock()
# Torch inference is not guaranteed thread-safe; serialize concurrent /analyze calls.
_infer_lock = threading.Lock()


def load_model(model_name: str = DEFAULT_MODEL) -> None:
    """Load the selected GLiNER model once."""
    global _loaded_model_name, _model
    if _model is not None:
        if _loaded_model_name != model_name:
            loaded = _loaded_model_name or "an unknown checkpoint"
            raise RuntimeError(
                f"GLiNER is already loaded with {loaded!r}; cannot load {model_name!r}"
            )
        return
    with _lock:
        if _model is not None:
            if _loaded_model_name != model_name:
                loaded = _loaded_model_name or "an unknown checkpoint"
                raise RuntimeError(
                    f"GLiNER is already loaded with {loaded!r}; cannot load {model_name!r}"
                )
            return
        from gliner import GLiNER

        _model = GLiNER.from_pretrained(model_name)
        _loaded_model_name = model_name


@lru_cache(maxsize=MODEL_INFERENCE_CACHE_SIZE)
def _predict_window(text: str):
    return _model.predict_entities(text, _LABELS, threshold=max(0.0, _PREDICT_FLOOR))


def detect_gliner(text: str, score_threshold: float = 0.0) -> list[Span]:
    if not text:
        return []
    if _model is None:
        raise RuntimeError("GLiNER model not loaded; load_semantic_backend() selects and loads it")
    n = len(text)
    # Run each window, shift spans back to absolute offsets, dedupe overlaps
    # (same span+label) keeping the max score.
    best: dict[tuple[int, int, str], float] = {}
    with _infer_lock:
        for offset, sub in _windows(text):
            for ent in _predict_window(sub):
                key = (offset + int(ent["start"]), offset + int(ent["end"]), ent["label"])
                score = float(ent["score"])
                if score > best.get(key, -1.0):
                    best[key] = score

    out: list[Span] = []
    for (start, end, label), score in best.items():
        # label is always one of _LABELS (== _LABEL_TO_TYPE keys), so a direct
        # lookup is safe.
        etype = _LABEL_TO_TYPE[label]
        floor = PER_LABEL_FLOOR[label]
        if label in _TUNABLE:
            floor = max(floor, score_threshold)
        if score < floor:
            continue
        # Drop out-of-bounds spans from tokenization bugs (would mask wrong text).
        if not 0 <= start < end <= n:
            continue
        out.append(Span(etype, start, end, score))
    return out
