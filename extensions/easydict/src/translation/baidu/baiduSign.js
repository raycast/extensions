/*
 * @author: tisfeng
 * @createTime: 2022-09-08 11:28
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-26 15:53
 * @fileName: baiduSign.js
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export default function genBaiduWebSign(t) {
  var r = null;
  const window_d = "320305.131321201";

  var o,
    i = t.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
  if (null === i) {
    var a = t.length;
    if (a > 30) {
      t = ""
        .concat(t.substr(0, 10))
        .concat(t.substr(Math.floor(a / 2) - 5, 10))
        .concat(t.substr(-10, 10));
    }
  } else {
    for (var s = t.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), c = 0, u = s.length, l = []; c < u; c++) {
      if ("" !== s[c]) {
        l.push.apply(
          l,
          (function (t) {
            if (Array.isArray(t)) return e(t);
          })((o = s[c].split(""))) ||
            (function (t) {
              if (("undefined" != typeof Symbol && null != t[Symbol.iterator]) || null != t["@@iterator"])
                return Array.from(t);
            })(o) ||
            (function (t, n) {
              if (t) {
                if ("string" == typeof t) return e(t, n);
                var r = Object.prototype.toString.call(t).slice(8, -1);
                return (
                  "Object" === r && t.constructor && (r = t.constructor.name),
                  "Map" === r || "Set" === r
                    ? Array.from(t)
                    : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)
                      ? e(t, n)
                      : void 0
                );
              }
            })(o) ||
            (function () {
              throw new TypeError(
                "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
              );
            })(),
        );
      }
      if (c !== u - 1) {
        l.push(i[c]);
      }
    }
    var p = l.length;
    if (p > 30) {
      t =
        l.slice(0, 10).join("") +
        l.slice(Math.floor(p / 2) - 5, Math.floor(p / 2) + 5).join("") +
        l.slice(-10).join("");
    }
  }
  for (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    var d = "".concat(String.fromCharCode(103)).concat(String.fromCharCode(116)).concat(String.fromCharCode(107)),
      h = (null !== r ? r : (r = window_d || "") || "").split("."),
      f = Number(h[0]) || 0,
      m = Number(h[1]) || 0,
      g = [],
      y = 0,
      v = 0;
    v < t.length;
    v++
  ) {
    var _ = t.charCodeAt(v);
    if (_ < 128) {
      g[y++] = _;
    } else if (_ < 2048) {
      g[y++] = (_ >> 6) | 192;
    } else if (55296 == (64512 & _) && v + 1 < t.length && 56320 == (64512 & t.charCodeAt(v + 1))) {
      _ = 65536 + ((1023 & _) << 10) + (1023 & t.charCodeAt(++v));
      g[y++] = (_ >> 18) | 240;
      g[y++] = ((_ >> 12) & 63) | 128;
    } else {
      g[y++] = (_ >> 12) | 224;
    }
    if (_ >= 128) {
      g[y++] = ((_ >> 6) & 63) | 128;
      g[y++] = (63 & _) | 128;
    }
  }
  for (
    var b = f,
      w =
        "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(97)) +
        "".concat(String.fromCharCode(94)).concat(String.fromCharCode(43)).concat(String.fromCharCode(54)),
      k =
        "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(51)) +
        "".concat(String.fromCharCode(94)).concat(String.fromCharCode(43)).concat(String.fromCharCode(98)) +
        "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(102)),
      x = 0;
    x < g.length;
    x++
  )
    b = n((b += g[x]), w);
  return (
    (b = n(b, k)),
    (b ^= m),
    b < 0 && (b = 2147483648 + (2147483647 & b)),
    "".concat((b %= 1e6).toString(), ".").concat(b ^ f)
  );
}

function e(t, e) {
  if (null == e || e > t.length) {
    e = t.length;
  }
  for (var n = 0, r = new Array(e); n < e; n++) r[n] = t[n];
  return r;
}
function n(t, e) {
  for (var n = 0; n < e.length - 2; n += 3) {
    var r = e.charAt(n + 2);
    r = "a" <= r ? r.charCodeAt(0) - 87 : Number(r);
    r = "+" === e.charAt(n + 1) ? t >>> r : t << r;
    t = "+" === e.charAt(n) ? (t + r) & 4294967295 : t ^ r;
  }
  return t;
}
