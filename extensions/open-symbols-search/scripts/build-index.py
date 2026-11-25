#!/usr/bin/env python3
"""Build assets/symbols.json from a clone of OrchardKit/open-symbols plus
upstream icon-package metadata (for search tags).

Usage:
  python3 scripts/build-index.py <open-symbols-clone> <npm-packages-dir>

<npm-packages-dir> holds extracted `npm pack` tarballs of: lucide-static,
@tabler/icons, @phosphor-icons/core, @mdi/svg, @fortawesome/fontawesome-free,
ionicons, feather-icons (each extracted into a folder whose name starts with
the tarball name, containing `package/`). Missing packages are skipped.
"""
import glob, json, os, re, subprocess, sys

repo, npm = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "symbols.json")

LIBS = [
    # id, display name, license
    ("feather", "Feather", "MIT"),
    ("font-awesome", "Font Awesome", "CC BY 4.0"),
    ("heroicons", "Heroicons", "MIT"),
    ("hugeicons", "Hugeicons", "MIT"),
    ("iconoir", "Iconoir", "MIT"),
    ("ionicons", "Ionicons", "MIT"),
    ("lucide", "Lucide", "ISC"),
    ("pictogrammers-material-design", "Material Design Icons", "Apache 2.0"),
    ("phosphor", "Phosphor", "MIT"),
    ("tabler", "Tabler", "MIT"),
]

def pkg(prefix):
    hits = sorted(glob.glob(os.path.join(npm, prefix + "*", "package")))
    return hits[-1] if hits else None

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

tags = {lib: {} for lib, _, _ in LIBS}

def add(lib, name, words):
    s = tags[lib].setdefault(name, set())
    for w in words:
        w = str(w).strip().lower()
        if w:
            s.add(w)

if p := pkg("lucide-static"):
    for n, t in load_json(f"{p}/tags.json").items():
        add("lucide", n, t)

if p := pkg("tabler-icons"):
    for n, v in load_json(f"{p}/icons.json").items():
        add("tabler", n, v.get("tags", []) + ([v["category"]] if v.get("category") else []))

if p := pkg("mdi-svg"):
    for v in load_json(f"{p}/meta.json"):
        words = list(v.get("aliases", []))
        for t in v.get("tags", []):
            words += re.split(r"\s*/\s*", t)
        add("pictogrammers-material-design", v["name"], words)

if p := pkg("fortawesome-fontawesome-free"):
    for n, v in load_json(f"{p}/metadata/icon-families.json").items():
        add("font-awesome", n, v.get("search", {}).get("terms", []) + [v.get("label", "")])

if p := pkg("ionicons"):
    for v in load_json(f"{p}/dist/ionicons.json")["icons"]:
        base = re.sub(r"-(outline|sharp)$", "", v["name"])
        add("ionicons", base, [t for t in v.get("tags", []) if t not in ("outline", "sharp")])

if p := pkg("feather-icons"):
    src = open(f"{p}/dist/feather.js", encoding="utf-8").read()
    for m in re.finditer(r'"([a-z0-9-]+)":\[((?:"[^"]*",?)+)\]', src):
        add("feather", m.group(1), re.findall(r'"([^"]*)"', m.group(2)))

if p := pkg("phosphor-icons-core"):
    src = open(f"{p}/dist/index.mjs", encoding="utf-8").read()
    for m in re.finditer(r'name: "([a-z0-9-]+)",(.*?)\n  \}', src, re.S):
        body = m.group(2)
        tm = re.search(r"tags: \[(.*?)\]", body, re.S)
        if tm:
            add("phosphor", m.group(1), [t for t in re.findall(r'"([^"]*)"', tm.group(1)) if not t.startswith("*")])

# Shared pool so libraries without upstream tags (Heroicons, Hugeicons,
# Iconoir) and unmatched names borrow tags from same-named icons elsewhere.
pool = {}
for lib in tags:
    for n, t in tags[lib].items():
        pool.setdefault(n, set()).update(t)

def lookup(lib, name):
    base = name[:-5] if name.endswith(".fill") else name
    t = set(tags.get(lib, {}).get(base, set()) | tags.get(lib, {}).get(name, set()))
    if not t:
        stem = re.sub(r"-(outline|solid|filled|\d+)$", "", base)
        t = set(tags.get(lib, {}).get(stem, set())) or set(pool.get(base, set()) | pool.get(stem, set()))
    return t

def git_ref():
    for args in (["describe", "--tags", "--exact-match"], ["rev-parse", "HEAD"]):
        r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
        if r.returncode == 0:
            return r.stdout.strip()
    return "main"

def tree_shas(lib):
    """Git tree SHAs for a library folder and its symbols/ folder. The update
    checker compares these with GitHub to see whether any symbol changed."""
    def sha(spec):
        r = subprocess.run(["git", "-C", repo, "rev-parse", spec], capture_output=True, text=True)
        return r.stdout.strip() if r.returncode == 0 else None
    return {"dir": sha(f"HEAD:{lib}"), "symbols": sha(f"HEAD:{lib}/symbols")}

out = {"ref": git_ref(), "trees": {}, "libraries": [], "symbols": []}
stats = {}
# List files from git so a blobless, no-checkout clone is enough.
tree = subprocess.run(["git", "-C", repo, "ls-tree", "-r", "--name-only", "HEAD"],
                      capture_output=True, text=True, check=True).stdout.splitlines()

# Keep only libraries present in this release, and pick up any new ones.
present = sorted({f.split("/")[0] for f in tree if f.count("/") == 2 and f.split("/")[1] == "symbols"})
known = {lib for lib, _, _ in LIBS}
LIBS = [l for l in LIBS if l[0] in present] + [
    (lib, lib.replace("-", " ").title(), "See library license") for lib in present if lib not in known
]
out["libraries"] = [{"id": i, "name": n, "license": l} for i, n, l in LIBS]
out["trees"] = {lib: tree_shas(lib) for lib, _, _ in LIBS}

for li, (lib, _, _) in enumerate(LIBS):
    prefix = f"{lib}/symbols/"
    names = sorted(f[len(prefix):-4] for f in tree if f.startswith(prefix) and f.endswith(".svg") and "/" not in f[len(prefix):])
    tagged = 0
    for name in names:
        t = lookup(lib, name)
        if t:
            tagged += 1
        name_words = set(re.split(r"[-.]", name))
        t = sorted(w for w in t if re.search(r"[a-z0-9]", w) and w not in name_words and w != name)
        out["symbols"].append([li, name, " ".join(t)] if t else [li, name])
    stats[lib] = (len(names), tagged)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
for lib, (n, t) in stats.items():
    print(f"{lib:32} {n:5} symbols, {t:5} with tags")
print("total", len(out["symbols"]), "->", os.path.getsize(OUT) // 1024, "KB")
