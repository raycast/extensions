# The detector patch

`compose.yaml` mounts `assets/detector-patch/gliner_layer.py` over the copy inside the
pinned detector image. It is a three-line change to one upstream file, vendored
verbatim so that rebasing onto a newer upstream is a diff rather than a rewrite.

```diff
+    "organization": _floor("organization", 0.50),
-_TUNABLE = {"person", "location", "address"}
+_TUNABLE = {"person", "location", "address", "organization"}
+    "organization": "ORGANIZATION",
```

Upstream is Apache-2.0. The vendored file carries the attribution header that
licence requires, and `assets/detector-patch/LICENSE` is its licence text.

## Why a patch and not configuration

Upstream hardcodes the label set the model is asked for:

```python
PER_LABEL_FLOOR = {"person": ..., "location": ..., "address": ...}
_LABELS = list(PER_LABEL_FLOOR)
```

The `entities` field on `/analyze` only filters the response; it cannot add a
label to the inference, and no environment variable exposes the list. So
organisation detection is unreachable without changing that file.

Nothing was retrained. GLiNER treats a label as a free-text query, which upstream
documents, so the shipped checkpoint answers an `organization` query out of its
base capability.

## Why mounting a file is safe here

The mount path contains the interpreter version
(`/opt/venv/lib/python3.14/site-packages/detector/gliner_layer.py`), which would
be fragile against an image that moved to another Python. It does not move,
because the image is pinned by digest. Changing the digest means rechecking this
path.

It works with `read_only: true`. Python cannot write the recompiled bytecode,
which costs a few milliseconds at import and nothing afterwards.

## What it detects

Company names, including ones absent from any list, which is the point: a
deny-list of known names cannot generalise.

Detection is imperfect. The confidence threshold is set to 0.50 in
`compose.yaml`; below it sit both genuine company names and ordinary phrases, so
lowering it to recover a missed company also masks unrelated text. Some companies
are therefore missed, and some internal team names are masked. Scores also vary
with surrounding text, so the same string can fall on either side of the
threshold in two different documents.

Over-masking is the harmless direction and the one this threshold favours.
Product and tooling names stayed clear of detection in every sample tested, which
`src/detection/semantic.integration.test.ts` asserts.
