# Detector image

Caviarde's semantic layer calls a locally-running PasteGuard detector. That image
is pinned by digest in `compose.yaml`, never by tag.

```
ghcr.io/sgasser/pasteguard@sha256:0122664876c0635efddbc61b838ca9bf1b821878396d46d8126bb95afe8d6a3c
```

## Why a digest and not a tag

The published image carries no signature and no attestation. Neither cosign nor
`gh attestation verify` has anything to check against; the SLSA predicate that
buildkit embeds is an unsigned in-toto blob that anyone with registry write
access could forge. The only non-forgeable link between the digest and its source
commit is the GitHub Actions run log, which expires on the default 90-day
retention. That run is dated 2026-07-31, so the link stops being verifiable
around the end of October 2026.

The upstream release job also runs a third-party action pinned to a mutable tag,
in the same job that later holds a registry write token. Pinning the digest makes
that irrelevant downstream, since a compromise there could only affect builds
that are never pulled.

## What was verified

Audited against upstream commit `88c206c` (v0.9.2) on 2026-08-02, by static
inspection only: the image was never executed during the review.

- The application code in the image is byte-for-byte identical to the upstream
  repository. Every one of the 45 bundled npm packages appears in the committed
  lockfile.
- All 22 layers map to a Dockerfile instruction. The final stage contains no
  `RUN`, `ADD`, `SHELL` or `ONBUILD`.
- It runs as UID 65532. No setuid or setgid file among 40,625 entries. No shell,
  no package manager, no `curl`, `wget`, `nc` or `ssh`.
- No telemetry or analytics dependency. `huggingface_hub`'s telemetry sender has
  no call site, and the image sets `HF_HUB_OFFLINE=1`.
- The 145 CA roots in the trust store are all well-known public authorities. No
  private root was injected.
- The model ships as a pickle rather than safetensors. Its pickle stream contains
  only the three canonical torch opcodes, and it is loaded with
  `weights_only=True` on `torch>=2.6`, the version that fixed CVE-2025-32434.
  That torch floor is load-bearing and must not be relaxed.
- No known vulnerability affects the resolved dependency set.

## Residual risk

`POST /analyze` has no authentication and no request size limit. `compose.yaml`
publishes it on loopback only; bounding the request size is Caviarde's
responsibility.

The upstream build is not reproducible: torch is installed with no version or
hash, the Python dependencies float without a lockfile, and the model checkpoint
is fetched with no revision pin.

The image carries a full Python interpreter and a JavaScript runtime.
Distroless here means no shell, not the absence of a way to run code.

The Detector URL preference is trusted as configured, and neither its scheme nor
its host is validated. Pointing it at anything other than loopback sends
clipboard text to that host, in clear text if the URL starts with `http://`. The
Auth Token preference exists for exactly that case. Nothing local prevents it, so
treat that field as the boundary of the tool's privacy claim.

The detector's inference cache holds submitted text in process memory for the
lifetime of the container. Reaching it requires code execution on the host, at
which point the clipboard itself is readable, so this is a property rather than
a risk.

## Detection thresholds

`compose.yaml` overrides the upstream confidence thresholds, which are tuned for
precision and drop most French names. For a masking tool the asymmetry runs the
other way: a false positive masks a harmless word, a false negative leaks a real
name.

The values in use are 0.95 for person, 0.70 for location and address, and 0.50
for organisation. They were chosen from a small sample of synthetic French text,
not from a benchmark. See `limitations.md`.

## Checking for upstream drift

Drift does not affect what runs locally; it signals an upstream build nobody has
reviewed.

```bash
token=$(curl -fsS "https://ghcr.io/token?scope=repository:sgasser/pasteguard:pull&service=ghcr.io" \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
curl -fsS -o /dev/null -D - -H "Authorization: Bearer ${token}" \
  -H 'Accept: application/vnd.oci.image.index.v1+json' \
  "https://ghcr.io/v2/sgasser/pasteguard/manifests/latest" \
  | grep -i '^docker-content-digest'
```

Repeat the checks above before changing the digest in `compose.yaml`.
