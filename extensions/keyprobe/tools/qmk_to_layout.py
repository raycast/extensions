#!/usr/bin/env python3
"""Builds a KeyProbe layout JSON from a pair of QMK source files:

  --keyboard-json  keyboards/<vendor>/<board>/.../keyboard.json
                    (or info.json on older boards) — absolute per-key
                    geometry, no KLE cumulative math needed:
                    layouts.<LAYOUT_NAME>.layout = [{matrix:[r,c],x,y,w,h}, ...]

  --keymap         keyboards/<vendor>/<board>/keymaps/<name>/keymap.c
                    (older style: keymaps[][MATRIX_ROWS][MATRIX_COLS] with a
                    LAYOUT(...) macro call) OR keymap.json (newer
                    data-driven style: {"layout": "LAYOUT_NAME",
                    "layers": [[...]]}, no C parsing needed — the file
                    picks its own --layout-name too). Either way we only
                    read one layer (--layer, default the first): QMK layers
                    only affect internal firmware state, not what macOS
                    keycode a *simple* press produces, so layer 0 (the
                    always-active base layer) is what a key tester should
                    show. The keymap's positional argument order is defined
                    to match keyboard.json's layout array order, so we zip
                    the two lists position-for-position.

This is a dev-time tool, not shipped in the extension: run it once per
keyboard you want to add, review the output, commit the resulting JSON to
assets/layouts/. See README.md's "自作キーボードレイアウト" section.
"""

import argparse
import json
import re
import sys

# QMK keycode name (without the KC_ prefix already stripped by the caller
# where convenient, but we key on the full name here) -> (macOS virtual
# keycode, on-screen label). None means "occupies a slot but macOS never
# sees a keyDown/keyUp for this by itself" (layer keys, unbound, or a
# consumer/media code our CGEventTap doesn't capture).
#
# Only entries actually exercised so far are included; extend this as new
# keyboards need keys it doesn't cover yet, verifying against a real board
# where possible (see README's "既知の制約" for what's still best-effort).
QMK_TO_MACOS = {
    "KC_A": (0, "A"), "KC_S": (1, "S"), "KC_D": (2, "D"), "KC_F": (3, "F"),
    "KC_H": (4, "H"), "KC_G": (5, "G"), "KC_Z": (6, "Z"), "KC_X": (7, "X"),
    "KC_C": (8, "C"), "KC_V": (9, "V"), "KC_B": (11, "B"), "KC_Q": (12, "Q"),
    "KC_W": (13, "W"), "KC_E": (14, "E"), "KC_R": (15, "R"), "KC_Y": (16, "Y"),
    "KC_T": (17, "T"), "KC_O": (31, "O"), "KC_U": (32, "U"), "KC_I": (34, "I"),
    "KC_P": (35, "P"), "KC_L": (37, "L"), "KC_J": (38, "J"), "KC_K": (40, "K"),
    "KC_N": (45, "N"), "KC_M": (46, "M"),
    "KC_1": (18, "1"), "KC_2": (19, "2"), "KC_3": (20, "3"), "KC_4": (21, "4"),
    "KC_5": (23, "5"), "KC_6": (22, "6"), "KC_7": (26, "7"), "KC_8": (28, "8"),
    "KC_9": (25, "9"), "KC_0": (29, "0"),
    "KC_MINS": (27, "-"), "KC_EQL": (24, "="), "KC_LBRC": (33, "["),
    "KC_RBRC": (30, "]"), "KC_BSLS": (42, "\\"), "KC_SCLN": (41, ";"),
    "KC_QUOT": (39, "'"), "KC_COMM": (43, ","), "KC_DOT": (47, "."),
    "KC_SLSH": (44, "/"), "KC_GRV": (50, "`"),
    # ⌘⌃⌥ only — those three are the ones actually printed on real Mac
    # keyboards, so they're instantly recognizable. Everything else (shift,
    # return, tab, caps lock, delete) is text: no equally-familiar symbol,
    # and each fits its key's actual width fine as text (per user feedback —
    # a previous pass over-applied symbols, e.g. ⎋ for a 1u esc key that
    # already fit "esc" as text just fine).
    "KC_TAB": (48, "tab"), "KC_SPC": (49, "space"), "KC_ENT": (36, "return"),
    "KC_BSPC": (51, "BS"), "KC_ESC": (53, "esc"),
    "KC_LCTL": (59, "⌃"), "KC_RCTL": (62, "⌃"),
    "KC_LSFT": (56, "shift"), "KC_RSFT": (60, "shift"),
    "KC_LALT": (58, "⌥"), "KC_RALT": (61, "⌥"),
    "KC_LGUI": (55, "⌘"), "KC_RGUI": (54, "⌘"),
    # Mac-labeled aliases (Keychron's Mac-mode default keymaps use these).
    "KC_LCMD": (55, "⌘"), "KC_RCMD": (54, "⌘"),
    "KC_LOPT": (58, "⌥"), "KC_ROPT": (61, "⌥"),
    "KC_CAPS": (57, "caps lock"),
    "KC_F1": (122, "F1"), "KC_F2": (120, "F2"), "KC_F3": (99, "F3"),
    "KC_F4": (118, "F4"), "KC_F5": (96, "F5"), "KC_F6": (97, "F6"),
    "KC_F7": (98, "F7"), "KC_F8": (100, "F8"), "KC_F9": (101, "F9"),
    "KC_F10": (109, "F10"), "KC_F11": (103, "F11"), "KC_F12": (111, "F12"),
    "KC_UP": (126, "↑"), "KC_DOWN": (125, "↓"), "KC_LEFT": (123, "←"),
    "KC_RGHT": (124, "→"), "KC_RIGHT": (124, "→"),
    "KC_HOME": (115, "↖"), "KC_END": (119, "↘"),
    "KC_PGUP": (116, "⇞"), "KC_PGDN": (121, "⇟"),
    "KC_DEL": (117, "Del"), "KC_INS": (114, "help"),
    # JIS-only (confirmed against real hardware log earlier in this project)
    "KC_RO": (94, "_"), "KC_JYEN": (93, "¥"),
    "KC_LNG1": (104, "かな"), "KC_KANA": (104, "かな"),
    "KC_LNG2": (102, "英数"), "KC_EISU": (102, "英数"),
    # PC "Application"/context-menu key -> kVK_Menu, confirmed against a
    # primary keycode reference (not yet cross-checked on real hardware).
    "KC_APP": (110, "menu"),
    # ISO-only, ANSI/QMK naming for the same two keys our iso.json already
    # uses — matching Sauce's kVK_ISO_Section for the bottom-left key, and
    # the same "reuse the shared home-row slot" best-effort call already
    # flagged as unverified in assets/layouts/jis.json/iso.json.
    "KC_NUBS": (10, "§"), "KC_NUHS": (42, "\\"),
    # KC_INT1 is QMK's own alias for KC_RO (same HID usage, same key).
    "KC_INT1": (94, "_"),
    # HID "InternationalN" usages, per the standard USB HID Keyboard/Keypad
    # page (International1=Ro, 2=Kana, 3=Yen, 4=Henkan, 5=Muhenkan) —
    # cross-checked against QMK's own quantum/keymap_extras/keymap_japanese.h
    # (JP_KANA -> KC_INT2, JP_YEN -> KC_INT3, JP_HENK -> KC_INT4,
    # JP_MHEN -> KC_INT5). INT4/INT5 keep no confirmed macOS keycode, same
    # as KC_MHEN/KC_HENK above — left unresolved rather than guessed.
    "KC_INT2": (104, "かな"), "KC_INT3": (93, "¥"),
    "KC_SPACE": (49, "space"),
    # Numpad (KeyRaycast's own fallback table, cross-checked earlier in
    # this project). KC_NUM (Num Lock) has no PC equivalent on a Mac
    # keyboard; Apple's own numpad prints "clear" at that position.
    "KC_P0": (82, "0"), "KC_P1": (83, "1"), "KC_P2": (84, "2"),
    "KC_P3": (85, "3"), "KC_P4": (86, "4"), "KC_P5": (87, "5"),
    "KC_P6": (88, "6"), "KC_P7": (89, "7"), "KC_P8": (91, "8"),
    "KC_P9": (92, "9"), "KC_PAST": (67, "*"), "KC_PSLS": (75, "/"),
    "KC_PMNS": (78, "-"), "KC_PPLS": (69, "+"), "KC_PDOT": (65, "."),
    "KC_PENT": (76, "return"), "KC_NUM": (71, "clear"),
    # JIS shifted-symbol keycodes still tap the same physical key as their
    # unshifted counterpart (e.g. { is Shift+[) — same reasoning as the
    # MT()/modifier-wrap unwrapping above.
    "KC_LCBR": (33, "["), "KC_RCBR": (30, "]"),
    # QMK's quantum/keymap_extras/keymap_japanese.h JP_* aliases, resolved
    # to whichever KC_*/KC_INT* they're #defined as in that header (fetched
    # directly rather than assumed, after an earlier keycode mixup in this
    # project taught us not to guess these).
    "JP_ZKHK": (50, "半角/全角"), "JP_MINS": (27, "-"), "JP_CIRC": (24, "^"),
    "JP_YEN": (93, "¥"), "JP_AT": (33, "@"), "JP_LBRC": (30, "["),
    "JP_SCLN": (41, ";"), "JP_COLN": (39, ":"), "JP_RBRC": (42, "]"),
    "JP_SLSH": (44, "/"), "JP_BSLS": (94, "_"), "JP_KANA": (104, "かな"),
    "JP_MHEN": None, "JP_HENK": None,
    # Tri-layer momentary switches (community-standard "Lower"/"Raise"
    # naming) and RGB/EEPROM/bootloader housekeeping keys — all
    # firmware-internal, none produce a keyDown/keyUp.
    "TL_LOWR": (None, "Lower"), "TL_UPPR": (None, "Raise"),
    "LOWER": (None, "Lower"), "RAISE": (None, "Raise"), "ADJUST": (None, "Adjust"),
    "BACKLIT": None,
    "QK_BOOT": None, "EE_CLR": None,
    "RM_TOGG": None, "RM_NEXT": None, "RM_PREV": None,
    "RM_HUEU": None, "RM_HUED": None, "RM_SATU": None, "RM_SATD": None,
    "RM_VALU": None, "RM_VALD": None, "RM_SPDU": None, "RM_SPDD": None,
    "BL_TOGG": None, "BL_STEP": None, "RGB_TOG": None, "RGB_MOD": None,
    # PC PrintScreen -> Apple's documented PC-keyboard-compatibility mapping
    # (unverified against real hardware, unlike the JIS/ISO entries above).
    "KC_PSCR": (105, "F13"),
    # QMK's "grave escape": sends Escape on a bare tap, but Grave/~ if
    # Shift/Cmd is held at release. We only model the bare-tap case (what a
    # key tester's "press this key" check actually exercises); the modified
    # cases aren't representable as a single static macOS keycode.
    "QK_GESC": (53, "esc"), "KC_GESC": (53, "esc"),
    # No stable macOS virtual keycode / not a real keyDown (consumer control,
    # or JIS keys Apple's own keyboards don't have a case for):
    "KC_STOP": None, "KC_MHEN": None, "KC_HENK": None, "KC_MUTE": None,
    "KC_MPLY": None, "KC_MNXT": None, "KC_MPRV": None,
    "KC_VOLU": None, "KC_VOLD": None, "KC_BRIU": None, "KC_BRID": None,
    "KC_MCTL": None, "KC_LPAD": None,
    # Mouse buttons / trackball mode toggles (common on Keyball-family
    # boards) — clicks and scroll-mode switches aren't keyDown/keyUp either.
    "MS_BTN1": None, "MS_BTN2": None, "MS_BTN3": None, "MOD_SCRL": None,
    "XXXXXXX": None, "_______": None, "KC_NO": None, "KC_TRNS": None,
    # Board-specific custom keycodes (via `enum custom_keycodes` +
    # process_record_user, e.g. splitkb/kyria's and orthodox's default
    # keymaps) whose actual behavior isn't visible from static parsing —
    # left unresolved on purpose rather than guessed at. Labeled by their
    # source name so the board is still reviewable at a glance.
    "ALT_ENT": None, "CTL_ESC": None, "CTL_QUOT": None,
    "FKEYS": None, "NAV": None, "SYM": None, "LS__SPC": None,
}


def strip_c_comments(text):
    text = re.sub(r"//.*", "", text)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def load_jsonc(path):
    """Some keyboard.json files (e.g. splitkb/kyria's rgb_matrix.layout)
    use // comments, which isn't strict JSON. Strip them state-machine
    style so a `//` inside a string value (like a URL) isn't touched."""
    text = open(path, encoding="utf-8").read()
    out = []
    in_string = False
    i = 0
    while i < len(text):
        ch = text[i]
        if in_string:
            out.append(ch)
            if ch == "\\" and i + 1 < len(text):
                out.append(text[i + 1])
                i += 2
                continue
            if ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < len(text) and text[i + 1] == "/":
            while i < len(text) and text[i] != "\n":
                i += 1
            continue
        out.append(ch)
        i += 1
    return json.loads("".join(out))


def extract_layer_block(keymap_c_source, layer_index):
    """Finds the Nth `LAYOUT(...)` call's argument list (balanced parens)."""
    calls = [m.start() for m in re.finditer(r"\bLAYOUT\w*\s*\(", keymap_c_source)]
    if layer_index >= len(calls):
        raise SystemExit(f"Only found {len(calls)} LAYOUT(...) calls, wanted index {layer_index}")
    start = keymap_c_source.index("(", calls[layer_index])
    depth = 0
    for i in range(start, len(keymap_c_source)):
        if keymap_c_source[i] == "(":
            depth += 1
        elif keymap_c_source[i] == ")":
            depth -= 1
            if depth == 0:
                return keymap_c_source[start + 1:i]
    raise SystemExit("Unbalanced parens in LAYOUT(...) call")


def split_top_level_commas(arg_text):
    tokens, depth, current = [], 0, []
    for ch in arg_text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            tokens.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    last = "".join(current).strip()
    if last:
        tokens.append(last)
    return [t for t in tokens if t]


def resolve_keycode(token):
    """Returns (macos_keycode_or_None, label, recognized). `recognized`
    is False only when nothing about the token was understood at all
    (unlike e.g. a deliberately-None dict entry or a matched layer-switch
    call, which are handled on purpose) — that's the signal the caller
    uses to warn about tokens worth reviewing by hand."""
    # MT(mod, KC_X) / LT(layer, KC_X): take the tap keycode (2nd arg).
    two_arg_wrap = re.match(r"^(MT|LT)\([^,]+,\s*(\w+)\)$", token)
    if two_arg_wrap:
        token = two_arg_wrap.group(2)

    # QMK's single-modifier mod-tap shorthands — CTL_T(KC_X) is literally
    # defined as MT(MOD_LCTL, KC_X), same idea as MT() but pre-filled.
    one_arg_modtap = re.match(
        r"^(?:CTL_T|SFT_T|ALT_T|GUI_T|LCTL_T|LSFT_T|LALT_T|LGUI_T|"
        r"RCTL_T|RSFT_T|RALT_T|RGUI_T|ALL_T|MEH_T|HYPR_T)\((\w+)\)$",
        token,
    )
    if one_arg_modtap:
        token = one_arg_modtap.group(1)

    # Plain modifier-hold wrappers (LALT(KC_GRV) = hold Alt, tap Grave) —
    # a bare press still taps the wrapped key, so the same reasoning as
    # MT()/LT() applies: show what a simple press produces.
    modifier_wrap = re.match(
        r"^(?:S|LCTL|LSFT|LALT|LGUI|RCTL|RSFT|RALT|RGUI|LCAG|LSA|LCA|SGUI|HYPR|MEH)\((\w+)\)$",
        token,
    )
    if modifier_wrap:
        token = modifier_wrap.group(1)

    if token in QMK_TO_MACOS:
        entry = QMK_TO_MACOS[token]
        if entry is None:
            return None, token, True
        keycode, label = entry
        return keycode, label, True

    # Layer-switch functions (MO/TG/TO/OSL/DF over a layer name or number)
    # — no OS keycode, but "Fn" / "Layer 1" reads better than the raw
    # "MO(_FN)" / "MO(1)" token.
    layer_call = re.match(r"^(?:MO|TG|TO|OSL|DF)\(_?(\w+)\)$", token)
    if layer_call:
        name = layer_call.group(1)
        label = f"Layer {name}" if name.isdigit() else name.replace("_", " ").title()
        return None, label, True

    return None, token, False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--keyboard-json", required=True)
    parser.add_argument("--keymap", required=True, help="path to keymap.c or keymap.json")
    parser.add_argument(
        "--layout-name",
        default=None,
        help="key under layouts.* in keyboard.json (default: keymap.json's own \"layout\" field, else \"LAYOUT\")",
    )
    parser.add_argument("--layer", type=int, default=0, help="which layer to read (0 = first/base)")
    parser.add_argument("--name", required=True, help="name field for the output layout JSON")
    parser.add_argument("--unit", type=float, default=46.0)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    is_json_keymap = args.keymap.endswith(".json")

    layout_name = args.layout_name
    if is_json_keymap:
        keymap_data = load_jsonc(args.keymap)
        tokens = keymap_data["layers"][args.layer]
        if layout_name is None:
            layout_name = keymap_data.get("layout", "LAYOUT")
    else:
        keymap_source = strip_c_comments(open(args.keymap).read())
        arg_text = extract_layer_block(keymap_source, args.layer)
        tokens = split_top_level_commas(arg_text)
        if layout_name is None:
            layout_name = "LAYOUT"

    kb = load_jsonc(args.keyboard_json)
    geometry = kb["layouts"][layout_name]["layout"]

    if len(tokens) != len(geometry):
        raise SystemExit(
            f"Mismatch: keyboard.json layout \"{layout_name}\" has {len(geometry)} positions, "
            f"layer {args.layer} of {args.keymap} has {len(tokens)} tokens. "
            "Wrong --layout-name/--layer, or this keymap doesn't 1:1 match "
            "keyboard.json's layout (check by hand)."
        )

    keys = []
    unresolved = []
    for geo, token in zip(geometry, tokens):
        keycode, label, recognized = resolve_keycode(token)
        if not recognized:
            unresolved.append(token)
        keys.append({
            "keycode": keycode,
            "x": geo["x"],
            "y": geo["y"],
            "w": geo.get("w", 1.0),
            "h": geo.get("h", 1.0),
            "label": label,
        })

    # Unlike the ANSI/JIS/ISO boards, a custom keyboard can legitimately bind
    # more than one physical key to the same keycode (e.g. a split board's
    # symmetric thumb clusters both sending KC_SPC) — the OS genuinely can't
    # tell them apart, so KeyboardView highlights every slot sharing a
    # keycode together rather than assuming one-slot-per-keycode.
    seen = {}
    for k in keys:
        if k["keycode"] is None:
            continue
        if k["keycode"] in seen:
            print(f"NOTE: keycode {k['keycode']} bound to multiple keys ({seen[k['keycode']]!r} and {k['label']!r}) — will highlight together", file=sys.stderr)
        seen[k["keycode"]] = k["label"]

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

    print(f"Wrote {args.out}: {len(keys)} keys, bounds {max_x}x{max_y}")
    if unresolved:
        print(f"WARNING: {len(unresolved)} token(s) had no known macOS keycode and are non-testable placeholders: {sorted(set(unresolved))}", file=sys.stderr)


if __name__ == "__main__":
    main()
