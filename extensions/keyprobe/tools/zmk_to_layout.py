#!/usr/bin/env python3
"""Builds a KeyProbe layout JSON from ZMK firmware sources. Unlike QMK,
ZMK boards vary a lot in how "resolvable" their default keymap is —
some are plain `&kp` token grids (moNa2, roBa), some rely on macros and
home-row-mod helpers we can't safely tokenize (cornix). So this tool
supports two independent modes, pick whichever fits the source:

  --mode bindings   Parse a `<name>.keymap` DTS file's default_layer
                     `bindings = < ... >;` block. Handles `&kp KEY`,
                     `&mt MOD KEY`, `&lt LAYER KEY`, and any other 2-arg
                     behavior by taking its last argument (same
                     "simple press still taps the wrapped/tapped key"
                     reasoning qmk_to_layout.py uses for MT()/LT()).
                     Zips 1:1 against the geometry file's key order,
                     which ZMK boards author in the same reading order
                     as their bindings grid (verified by hand per board
                     — don't assume, check before using this mode).

  --mode labels      Skip the keymap entirely and read each geometry
                     key's own "label" field (some ZMK info.json files,
                     e.g. Adv360-Pro, ship human-readable labels like
                     "Q", "Tab", "Caps" directly — no DTS parsing
                     needed at all).

Geometry (--geometry) is always a ZMK physical layout JSON:
  layouts.<LAYOUT_NAME>.layout = [{row, col, x, y, w?, h?, label?}, ...]
w/h default to 1.0 when absent (true for moNa2/roBa's own JSON — they're
plain column-staggered splits where every key really is 1u).

Dev-time tool, not shipped in the extension. See README's "ZMKファーム
ウェア対応" section for which boards use which mode and why.
"""

import argparse
import importlib.util
import json
import os
import re
import sys

_QMK_PATH = os.path.join(os.path.dirname(__file__), "qmk_to_layout.py")
_spec = importlib.util.spec_from_file_location("qmk_to_layout", _QMK_PATH)
_qmk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_qmk)
load_jsonc = _qmk.load_jsonc
strip_c_comments = _qmk.strip_c_comments
QMK_TO_MACOS = _qmk.QMK_TO_MACOS

# ZMK key name (as it appears bare in a `&kp NAME` binding, or as a
# geometry "label") -> the equivalent QMK_TO_MACOS key, so we reuse the
# already-verified macOS keycodes instead of re-deriving them by hand.
ZMK_ALIAS_TO_QMK = {
    **{c: f"KC_{c}" for c in "QWERTYUIOPASDFGHJKLZXCVBNM"},
    **{f"N{d}": f"KC_{d}" for d in "1234567890"},
    **{d: f"KC_{d}" for d in "1234567890"},
    "MINUS": "KC_MINS", "EQUAL": "KC_EQL", "-": "KC_MINS", "=": "KC_EQL",
    "LBKT": "KC_LBRC", "LEFT_BRACKET": "KC_LBRC",
    "RBKT": "KC_RBRC", "RIGHT_BRACKET": "KC_RBRC",
    "BSLH": "KC_BSLS", "BACKSLASH": "KC_BSLS", "\\": "KC_BSLS",
    "SEMI": "KC_SCLN", "SEMICOLON": "KC_SCLN", "COLON": "KC_SCLN", ";": "KC_SCLN",
    "SQT": "KC_QUOT", "APOS": "KC_QUOT", "'": "KC_QUOT",
    "DOUBLE_QUOTES": "KC_QUOT",
    "COMMA": "KC_COMM", ",": "KC_COMM",
    "DOT": "KC_DOT", "PERIOD": "KC_DOT", ".": "KC_DOT",
    "SLASH": "KC_SLSH", "FSLH": "KC_SLSH", "/": "KC_SLSH",
    "GRAVE": "KC_GRV", "`": "KC_GRV",
    "TAB": "KC_TAB", "Tab": "KC_TAB", "SPACE": "KC_SPC", "SPC": "KC_SPC",
    "ENTER": "KC_ENT", "RET": "KC_ENT", "RETURN": "KC_ENT",
    "BACKSPACE": "KC_BSPC", "BSPC": "KC_BSPC", "Bksp": "KC_BSPC",
    "ESCAPE": "KC_ESC", "ESC": "KC_ESC",
    "DELETE": "KC_DEL", "DEL": "KC_DEL", "Del": "KC_DEL",
    "CAPSLOCK": "KC_CAPS", "CAPS": "KC_CAPS", "Caps": "KC_CAPS",
    "LEFT_SHIFT": "KC_LSFT", "LSHFT": "KC_LSFT", "LSHIFT": "KC_LSFT", "LShift": "KC_LSFT",
    "RIGHT_SHIFT": "KC_RSFT", "RSHFT": "KC_RSFT", "RSHIFT": "KC_RSFT", "RShift": "KC_RSFT",
    "LCTRL": "KC_LCTL", "LEFT_CONTROL": "KC_LCTL", "LCtrl": "KC_LCTL",
    "RCTRL": "KC_RCTL", "RIGHT_CONTROL": "KC_RCTL", "RCtrl": "KC_RCTL",
    "LEFT_ALT": "KC_LALT", "LALT": "KC_LALT", "LAlt": "KC_LALT",
    "RIGHT_ALT": "KC_RALT", "RALT": "KC_RALT", "RAlt": "KC_RALT",
    "LEFT_WIN": "KC_LGUI", "LGUI": "KC_LGUI", "LEFT_GUI": "KC_LGUI", "LGui": "KC_LGUI",
    "RIGHT_WIN": "KC_RGUI", "RGUI": "KC_RGUI", "RIGHT_GUI": "KC_RGUI", "RGui": "KC_RGUI",
    "HOME": "KC_HOME", "Home": "KC_HOME",
    "END": "KC_END", "End": "KC_END",
    "PAGE_UP": "KC_PGUP", "PG_UP": "KC_PGUP", "PgUp": "KC_PGUP",
    "PAGE_DOWN": "KC_PGDN", "PG_DN": "KC_PGDN", "PgDn": "KC_PGDN",
    "UP": "KC_UP", "Up": "KC_UP",
    "DOWN": "KC_DOWN", "Down": "KC_DOWN",
    "LEFT": "KC_LEFT", "Left": "KC_LEFT",
    "RIGHT": "KC_RGHT", "Right": "KC_RGHT",
    **{f"F{n}": f"KC_F{n}" for n in range(1, 13)},
    # JIS Henkan/Muhenkan — no confirmed macOS keycode exists (same
    # conclusion reached for QMK's KC_HENK/KC_MHEN during the JIS work).
    "INT_HENKAN": "KC_HENK", "INT_MUHENKAN": "KC_MHEN",
    "KANA": "KC_KANA",
}

# Tokens with no QMK equivalent at all (consumer-control / system, never
# produce a keyDown our CGEventTap sees) — None means "recognized but
# intentionally non-testable", same convention as QMK_TO_MACOS.
ZMK_NONE_ONLY = {
    "C_VOL_UP", "C_VOL_DN", "C_MUTE", "C_PP", "C_PLAY_PAUSE", "C_NEXT",
    "C_PREV", "C_BRI_UP", "C_BRI_DN", "C_AC_HOME", "MSCRL_UP", "MSCRL_DOWN",
    "MB1", "MB2", "MB3", "MB4", "MB5",
}

# ZMK behaviors that never resolve to a physical-key press — layer/system
# actions, or actions whose args aren't a base keycode. Label reads better
# than the raw behavior name where an obvious human name exists.
BEHAVIOR_LABELS = {
    "trans": "(transparent)", "none": None, "mo": "layer", "to": "layer",
    "tog": "layer", "bt": "bluetooth", "out": "output", "ext_power": "power",
    "rgb_ug": "RGB", "bootloader": "boot", "sys_reset": "reset",
    "caps_word": "caps word", "sk": "sticky", "studio_unlock": "unlock",
    "gresc": "esc",
}


def unwrap_zmk_modifier(token):
    """LS(X)/LG(X)/LC(X)/LA(X)/RS(X)/RG(X)/RC(X)/RA(X), nested — a bare
    press still taps the wrapped key, same reasoning as QMK's S()/LSFT()."""
    while True:
        m = re.match(r"^(?:LS|RS|LC|RC|LA|RA|LG|RG)\((.+)\)$", token)
        if not m:
            return token
        token = m.group(1)


def resolve_zmk_keycode(token):
    """Returns (macos_keycode_or_None, label, recognized) — mirrors
    qmk_to_layout.resolve_keycode's contract."""
    base = unwrap_zmk_modifier(token)
    if base in ZMK_NONE_ONLY:
        return None, base.replace("C_", "").replace("_", " ").title(), True
    # Adv360-Pro's info.json labels its six-key thumb/mod blocks "mod1"..
    # "mod8" — no single fixed keycode (board/owner-specific), so these
    # are intentionally non-testable rather than an unresolved token.
    if re.match(r"^mod\d+$", base):
        return None, base, True
    qmk_name = ZMK_ALIAS_TO_QMK.get(base)
    if qmk_name and qmk_name in QMK_TO_MACOS:
        entry = QMK_TO_MACOS[qmk_name]
        if entry is None:
            return None, base, True
        keycode, label = entry
        return keycode, label, True
    return None, token, False


def resolve_zmk_binding(behavior, args):
    """Returns (macos_keycode_or_None, label, recognized)."""
    if behavior == "kp" and len(args) == 1:
        return resolve_zmk_keycode(args[0])
    if behavior in ("mt", "lt", "sk") and len(args) >= 1:
        return resolve_zmk_keycode(args[-1])
    if behavior in BEHAVIOR_LABELS:
        label = BEHAVIOR_LABELS[behavior]
        return None, (label if label is not None else behavior), True
    # Unknown/custom behavior (project-specific names like
    # `lt_to_layer_0`, `to_layer_0`): if its last arg looks like a
    # resolvable keycode, assume "hold does something, tap sends this
    # key" — same heuristic QMK's LT()/MT() wrapping already relies on.
    if args:
        keycode, label, recognized = resolve_zmk_keycode(args[-1])
        if recognized:
            return keycode, label, True
    return None, behavior, False


def extract_layer_bindings(source, layer_name):
    idx = source.index(layer_name)
    brace_start = source.index("{", idx)
    depth = 0
    i = brace_start
    while True:
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    block = source[brace_start:i]
    m = re.search(r"bindings\s*=\s*<(.*?)>\s*;", block, re.DOTALL)
    if not m:
        raise SystemExit(f"couldn't find a `bindings = < ... >;` block inside {layer_name}")
    return m.group(1)


def tokenize_bindings(text):
    """Splits a `bindings = < ... >` block into (behavior, [args]) calls.
    ZMK writes these as whitespace-separated `&behavior arg arg ...`
    runs with no other delimiter, so a new call starts at each `&token`
    and everything before the next `&` is its argument list."""
    raw = text.split()
    calls = []
    for tok in raw:
        if tok.startswith("&"):
            calls.append([tok[1:], []])
        else:
            if not calls:
                raise SystemExit(f"binding argument {tok!r} appears before any `&behavior`")
            calls[-1][1].append(tok)
    return calls


def build_keys(geometry, resolved):
    if len(geometry) != len(resolved):
        raise SystemExit(
            f"Mismatch: geometry has {len(geometry)} keys, resolved {len(resolved)} bindings/labels. "
            "Wrong --layout-name, or this keymap's binding order doesn't match the geometry file's "
            "key order (check by hand before trusting --mode bindings)."
        )
    keys = []
    unresolved = []
    for geo, (keycode, label, recognized) in zip(geometry, resolved):
        if not recognized:
            unresolved.append(label)
        keys.append({
            "keycode": keycode,
            "x": geo["x"],
            "y": geo["y"],
            "w": geo.get("w", 1.0),
            "h": geo.get("h", 1.0),
            "label": label,
        })
    return keys, unresolved


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--geometry", required=True, help="ZMK physical layout JSON (e.g. config/<board>.json)")
    parser.add_argument("--layout-name", required=True, help="key under layouts.* in the geometry file")
    parser.add_argument("--mode", choices=["bindings", "labels"], default="bindings")
    parser.add_argument("--keymap", help="required for --mode bindings: path to the .keymap DTS file")
    parser.add_argument("--layer-name", default="default_layer", help="DTS layer node name (--mode bindings only)")
    parser.add_argument("--name", required=True)
    parser.add_argument("--unit", type=float, default=46.0)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    geo_data = load_jsonc(args.geometry)
    geometry = geo_data["layouts"][args.layout_name]["layout"]

    if args.mode == "bindings":
        if not args.keymap:
            raise SystemExit("--mode bindings requires --keymap")
        source = strip_c_comments(open(args.keymap, encoding="utf-8", errors="replace").read())
        block = extract_layer_bindings(source, args.layer_name)
        calls = tokenize_bindings(block)
        resolved = [resolve_zmk_binding(behavior, call_args) for behavior, call_args in calls]
    else:
        resolved = []
        for geo in geometry:
            label = geo.get("label", "")
            keycode, out_label, recognized = resolve_zmk_keycode(label)
            resolved.append((keycode, out_label if recognized else label, recognized))

    keys, unresolved = build_keys(geometry, resolved)

    seen = {}
    for k in keys:
        if k["keycode"] is None:
            continue
        if k["keycode"] in seen:
            print(f"NOTE: keycode {k['keycode']} bound to multiple keys ({seen[k['keycode']]!r} and {k['label']!r}) — will highlight together", file=sys.stderr)
        seen[k["keycode"]] = k["label"]

    for tok in unresolved:
        print(f"WARNING: unresolved token {tok!r} — treated as non-testable (keycode: null)", file=sys.stderr)

    max_x = max(k["x"] + k["w"] for k in keys)
    max_y = max(k["y"] + k["h"] for k in keys)

    layout = {
        "name": args.name,
        "unit": args.unit,
        "width": round(max_x, 2),
        "height": round(max_y, 2),
        "keys": keys,
    }
    with open(args.out, "w") as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)
    print(f"Wrote {args.out}: {len(keys)} keys, {len(seen)} distinct keycodes, {len(unresolved)} unresolved.")


if __name__ == "__main__":
    main()
