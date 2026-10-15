/**
 * Preact v10 — MIT License
 * Copyright (c) 2015-present Jason Miller
 * https://github.com/preactjs/preact
 */
var n,
  l,
  u,
  t,
  i,
  r,
  o,
  e,
  f,
  c,
  a,
  s,
  h,
  p,
  v,
  y,
  d = {},
  w = [],
  _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,
  g = Array.isArray;
function m(n, l) {
  for (var u in l) n[u] = l[u];
  return n;
}
function b(n) {
  n && n.parentNode && n.parentNode.removeChild(n);
}
function k(l, u, t) {
  var i,
    r,
    o,
    e = {};
  for (o in u)
    "key" == o ? (i = u[o]) : "ref" == o ? (r = u[o]) : (e[o] = u[o]);
  if (
    (arguments.length > 2 &&
      (e.children = arguments.length > 3 ? n.call(arguments, 2) : t),
    "function" == typeof l && null != l.defaultProps)
  )
    for (o in l.defaultProps) void 0 === e[o] && (e[o] = l.defaultProps[o]);
  return x(l, e, i, r, null);
}
function x(n, t, i, r, o) {
  var e = {
    type: n,
    props: t,
    key: i,
    ref: r,
    __k: null,
    __: null,
    __b: 0,
    __e: null,
    __c: null,
    constructor: void 0,
    __v: null == o ? ++u : o,
    __i: -1,
    __u: 0,
  };
  return (null == o && null != l.vnode && l.vnode(e), e);
}
function M() {
  return { current: null };
}
function S(n) {
  return n.children;
}
function C(n, l) {
  ((this.props = n), (this.context = l));
}
function $(n, l) {
  if (null == l) return n.__ ? $(n.__, n.__i + 1) : null;
  for (var u; l < n.__k.length; l++)
    if (null != (u = n.__k[l]) && null != u.__e) return u.__e;
  return "function" == typeof n.type ? $(n) : null;
}
function I(n) {
  if (n.__P && n.__d) {
    var u = n.__v,
      t = u.__e,
      i = [],
      r = [],
      o = m({}, u);
    ((o.__v = u.__v + 1),
      l.vnode && l.vnode(o),
      q(
        n.__P,
        o,
        u,
        n.__n,
        n.__P.namespaceURI,
        32 & u.__u ? [t] : null,
        i,
        null == t ? $(u) : t,
        !!(32 & u.__u),
        r,
      ),
      (o.__v = u.__v),
      (o.__.__k[o.__i] = o),
      D(i, o, r),
      (u.__e = u.__ = null),
      o.__e != t && P(o));
  }
}
function P(n) {
  if (null != (n = n.__) && null != n.__c)
    return (
      (n.__e = n.__c.base = null),
      n.__k.some(function (l) {
        if (null != l && null != l.__e) return (n.__e = n.__c.base = l.__e);
      }),
      P(n)
    );
}
function A(n) {
  ((!n.__d && (n.__d = !0) && i.push(n) && !H.__r++) ||
    r != l.debounceRendering) &&
    ((r = l.debounceRendering) || o)(H);
}
function H() {
  try {
    for (var n, l = 1; i.length;)
      (i.length > l && i.sort(e), (n = i.shift()), (l = i.length), I(n));
  } finally {
    i.length = H.__r = 0;
  }
}
function L(n, l, u, t, i, r, o, e, f, c, a) {
  var s,
    h,
    p,
    v,
    y,
    _,
    g = (t && t.__k) || w,
    m = l.length;
  for (f = T(u, l, g, f, m), s = 0; s < m; s++)
    null != (p = u.__k[s]) &&
      ((h = (-1 != p.__i && g[p.__i]) || d),
      (p.__i = s),
      (_ = q(n, p, h, i, r, o, e, f, c, a)),
      (v = p.__e),
      p.ref &&
        h.ref != p.ref &&
        (h.ref && J(h.ref, null, p), a.push(p.ref, p.__c || v, p)),
      null == y && null != v && (y = v),
      4 & p.__u
        ? ((f = j(p, f, n)), h.__e && (h.__e = null))
        : "function" == typeof p.type && void 0 !== _
          ? (f = _)
          : v && (f = v.nextSibling),
      (p.__u &= -7));
  return ((u.__e = y), f);
}
function T(n, l, u, t, i) {
  var r,
    o,
    e,
    f,
    c,
    a = u.length,
    s = a,
    h = 0;
  for (n.__k = new Array(i), r = 0; r < i; r++)
    null != (o = l[r]) && "boolean" != typeof o && "function" != typeof o
      ? ("string" == typeof o ||
        "number" == typeof o ||
        "bigint" == typeof o ||
        o.constructor == String
          ? (o = n.__k[r] = x(null, o, null, null, null))
          : g(o)
            ? (o = n.__k[r] = x(S, { children: o }, null, null, null))
            : void 0 === o.constructor && o.__b > 0
              ? (o = n.__k[r] =
                  x(o.type, o.props, o.key, o.ref ? o.ref : null, o.__v))
              : (n.__k[r] = o),
        (f = r + h),
        (o.__ = n),
        (o.__b = n.__b + 1),
        (e = null),
        -1 != (c = o.__i = O(o, u, f, s)) && (s--, (e = u[c]) && (e.__u |= 2)),
        null == e || null == e.__v
          ? (-1 == c && (i > a ? h-- : i < a && h++),
            "function" != typeof o.type && (o.__u |= 4))
          : c != f &&
            (c == f - 1
              ? h--
              : c == f + 1
                ? h++
                : (c > f ? h-- : h++, (o.__u |= 4))))
      : (n.__k[r] = null);
  if (s)
    for (r = 0; r < a; r++)
      null != (e = u[r]) &&
        0 == (2 & e.__u) &&
        (e.__e == t && (t = $(e)), K(e, e));
  return t;
}
function j(n, l, u) {
  var t, i;
  if ("function" == typeof n.type) {
    for (t = n.__k, i = 0; t && i < t.length; i++)
      t[i] && ((t[i].__ = n), (l = j(t[i], l, u)));
    return l;
  }
  n.__e != l &&
    (l && n.type && !l.parentNode && (l = $(n)),
    (l = u.insertBefore(n.__e, l || null)));
  do {
    l = l && l.nextSibling;
  } while (null != l && 8 == l.nodeType);
  return l;
}
function F(n, l) {
  return (
    (l = l || []),
    null == n ||
      "boolean" == typeof n ||
      (g(n)
        ? n.some(function (n) {
            F(n, l);
          })
        : l.push(n)),
    l
  );
}
function O(n, l, u, t) {
  var i,
    r,
    o,
    e = n.key,
    f = n.type,
    c = l[u],
    a = null != c && 0 == (2 & c.__u);
  if ((null === c && null == e) || (a && e == c.key && f == c.type)) return u;
  if (t > (a ? 1 : 0))
    for (i = u - 1, r = u + 1; i >= 0 || r < l.length;)
      if (
        null != (c = l[(o = i >= 0 ? i-- : r++)]) &&
        0 == (2 & c.__u) &&
        e == c.key &&
        f == c.type
      )
        return o;
  return -1;
}
function z(n, l, u) {
  "-" == l[0]
    ? n.setProperty(l, null == u ? "" : u)
    : (n[l] =
        null == u ? "" : "number" != typeof u || _.test(l) ? u : u + "px");
}
function N(n, l, u, t, i) {
  var r, o;
  n: if ("style" == l)
    if ("string" == typeof u) n.style.cssText = u;
    else {
      if (("string" == typeof t && (n.style.cssText = t = ""), t))
        for (l in t) (u && l in u) || z(n.style, l, "");
      if (u) for (l in u) (t && u[l] == t[l]) || z(n.style, l, u[l]);
    }
  else if ("o" == l[0] && "n" == l[1])
    ((r = l != (l = l.replace(s, "$1"))),
      (o = l.toLowerCase()),
      (l =
        o in n || "onFocusOut" == l || "onFocusIn" == l
          ? o.slice(2)
          : l.slice(2)),
      n.l || (n.l = {}),
      (n.l[l + r] = u),
      u
        ? t
          ? (u[a] = t[a])
          : ((u[a] = h), n.addEventListener(l, r ? v : p, r))
        : n.removeEventListener(l, r ? v : p, r));
  else {
    if ("http://www.w3.org/2000/svg" == i)
      l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (
      "width" != l &&
      "height" != l &&
      "href" != l &&
      "list" != l &&
      "form" != l &&
      "tabIndex" != l &&
      "download" != l &&
      "rowSpan" != l &&
      "colSpan" != l &&
      "role" != l &&
      "popover" != l &&
      l in n
    )
      try {
        n[l] = null == u ? "" : u;
        break n;
      } catch (n) {}
    "function" == typeof u ||
      (null == u || (!1 === u && "-" != l[4])
        ? n.removeAttribute(l)
        : n.setAttribute(l, "popover" == l && 1 == u ? "" : u));
  }
}
function V(n) {
  return function (u) {
    if (this.l) {
      var t = this.l[u.type + n];
      if (null == u[c]) u[c] = h++;
      else if (u[c] < t[a]) return;
      return t(l.event ? l.event(u) : u);
    }
  };
}
function q(n, u, t, i, r, o, e, f, c, a) {
  var s,
    h,
    p,
    v,
    y,
    d,
    _,
    k,
    x,
    M,
    I,
    P,
    A,
    H,
    T,
    j,
    F = u.type;
  if (void 0 !== u.constructor) return null;
  (128 & t.__u && ((c = !!(32 & t.__u)), (o = [(f = u.__e = t.__e)])),
    (s = l.__b) && s(u));
  n: if ("function" == typeof F) {
    h = e.length;
    try {
      if (
        ((x = u.props),
        (M = F.prototype && F.prototype.render),
        (I = (s = F.contextType) && i[s.__c]),
        (P = s ? (I ? I.props.value : s.__) : i),
        t.__c
          ? (k = (p = u.__c = t.__c).__ = p.__E)
          : (M
              ? (u.__c = p = new F(x, P))
              : ((u.__c = p = new C(x, P)),
                (p.constructor = F),
                (p.render = Q)),
            I && I.sub(p),
            p.state || (p.state = {}),
            (p.__n = i),
            (v = p.__d = !0),
            (p.__h = []),
            (p._sb = [])),
        M && null == p.__s && (p.__s = p.state),
        M &&
          null != F.getDerivedStateFromProps &&
          (p.__s == p.state && (p.__s = m({}, p.__s)),
          m(p.__s, F.getDerivedStateFromProps(x, p.__s))),
        (y = p.props),
        (d = p.state),
        (p.__v = u),
        v)
      )
        (M &&
          null == F.getDerivedStateFromProps &&
          null != p.componentWillMount &&
          p.componentWillMount(),
          M && null != p.componentDidMount && p.__h.push(p.componentDidMount));
      else {
        if (
          (M &&
            null == F.getDerivedStateFromProps &&
            x !== y &&
            null != p.componentWillReceiveProps &&
            p.componentWillReceiveProps(x, P),
          u.__v == t.__v ||
            (!p.__e &&
              null != p.shouldComponentUpdate &&
              !1 === p.shouldComponentUpdate(x, p.__s, P)))
        ) {
          (u.__v != t.__v && ((p.props = x), (p.state = p.__s), (p.__d = !1)),
            (u.__e = t.__e),
            (u.__k = t.__k),
            u.__k.some(function (n) {
              n && (n.__ = u);
            }),
            w.push.apply(p.__h, p._sb),
            (p._sb = []),
            p.__h.length && e.push(p),
            (f = $(t)));
          break n;
        }
        (null != p.componentWillUpdate && p.componentWillUpdate(x, p.__s, P),
          M &&
            null != p.componentDidUpdate &&
            p.__h.push(function () {
              p.componentDidUpdate(y, d, _);
            }));
      }
      if (
        ((p.context = P),
        (p.props = x),
        (p.__P = n),
        (p.__e = !1),
        (A = l.__r),
        (H = 0),
        M)
      )
        ((p.state = p.__s),
          (p.__d = !1),
          A && A(u),
          (s = p.render(p.props, p.state, p.context)),
          w.push.apply(p.__h, p._sb),
          (p._sb = []));
      else
        do {
          ((p.__d = !1),
            A && A(u),
            (s = p.render(p.props, p.state, p.context)),
            (p.state = p.__s));
        } while (p.__d && ++H < 25);
      ((p.state = p.__s),
        null != p.getChildContext && (i = m(m({}, i), p.getChildContext())),
        M &&
          !v &&
          null != p.getSnapshotBeforeUpdate &&
          (_ = p.getSnapshotBeforeUpdate(y, d)),
        (T =
          null != s && s.type === S && null == s.key ? E(s.props.children) : s),
        (f = L(n, g(T) ? T : [T], u, t, i, r, o, e, f, c, a)),
        (p.base = u.__e),
        (u.__u &= -161),
        p.__h.length && e.push(p),
        k && (p.__E = p.__ = null));
    } catch (n) {
      if (((e.length = h), (u.__v = null), c || null != o)) {
        if (n.then) {
          for (u.__u |= c ? 160 : 128; f && 8 == f.nodeType && f.nextSibling;)
            f = f.nextSibling;
          (null != o && (o[o.indexOf(f)] = null), (u.__e = f));
        } else if (null != o) for (j = o.length; j--;) b(o[j]);
      } else u.__e = t.__e;
      (null == u.__k && (u.__k = t.__k || []), n.then || B(u), l.__e(n, u, t));
    }
  } else
    null == o && u.__v == t.__v
      ? ((u.__k = t.__k), (u.__e = t.__e))
      : (f = u.__e = G(t.__e, u, t, i, r, o, e, c, a));
  return ((s = l.diffed) && s(u), 128 & u.__u ? void 0 : f);
}
function B(n) {
  n && (n.__c && (n.__c.__e = !0), n.__k && n.__k.some(B));
}
function D(n, u, t) {
  for (var i = 0; i < t.length; i++) J(t[i], t[++i], t[++i]);
  (l.__c && l.__c(u, n),
    n.some(function (u) {
      try {
        ((n = u.__h),
          (u.__h = []),
          n.some(function (n) {
            n.call(u);
          }));
      } catch (n) {
        l.__e(n, u.__v);
      }
    }));
}
function E(n) {
  return "object" != typeof n || null == n || n.__b > 0
    ? n
    : g(n)
      ? n.map(E)
      : void 0 !== n.constructor
        ? null
        : m({}, n);
}
function G(u, t, i, r, o, e, f, c, a) {
  var s,
    h,
    p,
    v,
    y,
    w,
    _,
    m = i.props || d,
    k = t.props,
    x = t.type;
  if (
    ("svg" == x
      ? (o = "http://www.w3.org/2000/svg")
      : "math" == x
        ? (o = "http://www.w3.org/1998/Math/MathML")
        : o || (o = "http://www.w3.org/1999/xhtml"),
    null != e)
  )
    for (s = 0; s < e.length; s++)
      if (
        (y = e[s]) &&
        "setAttribute" in y == !!x &&
        (x ? y.localName == x : 3 == y.nodeType)
      ) {
        ((u = y), (e[s] = null));
        break;
      }
  if (null == u) {
    if (null == x) return document.createTextNode(k);
    ((u = document.createElementNS(o, x, k.is && k)),
      c && (l.__m && l.__m(t, e), (c = !1)),
      (e = null));
  }
  if (null == x) m === k || (c && u.data == k) || (u.data = k);
  else {
    if (
      ((e =
        "textarea" == x && null != k.defaultValue
          ? null
          : e && n.call(u.childNodes)),
      !c && null != e)
    )
      for (m = {}, s = 0; s < u.attributes.length; s++)
        m[(y = u.attributes[s]).name] = y.value;
    for (s in m)
      ((y = m[s]),
        "dangerouslySetInnerHTML" == s
          ? (p = y)
          : "children" == s ||
            s in k ||
            ("value" == s && "defaultValue" in k) ||
            ("checked" == s && "defaultChecked" in k) ||
            N(u, s, null, y, o));
    for (s in k)
      ((y = k[s]),
        "children" == s
          ? (v = y)
          : "dangerouslySetInnerHTML" == s
            ? (h = y)
            : "value" == s
              ? (w = y)
              : "checked" == s
                ? (_ = y)
                : (c && "function" != typeof y) ||
                  m[s] === y ||
                  N(u, s, y, m[s], o));
    if (h)
      (c ||
        (p && (h.__html == p.__html || h.__html == u.innerHTML)) ||
        (u.innerHTML = h.__html),
        (t.__k = []));
    else if (
      (p && (u.innerHTML = ""),
      L(
        "template" == t.type ? u.content : u,
        g(v) ? v : [v],
        t,
        i,
        r,
        "foreignObject" == x ? "http://www.w3.org/1999/xhtml" : o,
        e,
        f,
        e ? e[0] : i.__k && $(i, 0),
        c,
        a,
      ),
      null != e)
    )
      for (s = e.length; s--;) b(e[s]);
    (c && "textarea" != x) ||
      ((s = "value"),
      "progress" == x && null == w
        ? u.removeAttribute("value")
        : null != w &&
          (w !== u[s] ||
            ("progress" == x && !w) ||
            ("option" == x && w != m[s])) &&
          N(u, s, w, m[s], o),
      (s = "checked"),
      null != _ && _ != u[s] && N(u, s, _, m[s], o));
  }
  return u;
}
function J(n, u, t) {
  try {
    if ("function" == typeof n) {
      var i = "function" == typeof n.__u;
      (i && n.__u(), (i && null == u) || (n.__u = n(u)));
    } else n.current = u;
  } catch (n) {
    l.__e(n, t);
  }
}
function K(n, u, t) {
  var i, r;
  if (
    (l.unmount && l.unmount(n),
    (i = n.ref) && ((i.current && i.current != n.__e) || J(i, null, u)),
    null != (i = n.__c))
  ) {
    if (i.componentWillUnmount)
      try {
        i.componentWillUnmount();
      } catch (n) {
        l.__e(n, u);
      }
    i.base = i.__P = i.__n = null;
  }
  if ((i = n.__k))
    for (r = 0; r < i.length; r++)
      i[r] && K(i[r], u, t || "function" != typeof n.type);
  (t || b(n.__e), (n.__c = n.__ = n.__e = void 0));
}
function Q(n, l, u) {
  return this.constructor(n, u);
}
function R(u, t, i) {
  var r, o, e, f;
  (t == document && (t = document.documentElement),
    l.__ && l.__(u, t),
    (o = (r = "function" == typeof i) ? null : (i && i.__k) || t.__k),
    (e = []),
    (f = []),
    q(
      t,
      (u = ((!r && i) || t).__k = k(S, null, [u])),
      o || d,
      d,
      t.namespaceURI,
      !r && i ? [i] : o ? null : t.firstChild ? n.call(t.childNodes) : null,
      e,
      !r && i ? i : o ? o.__e : t.firstChild,
      r,
      f,
    ),
    D(e, u, f),
    (u.props.children = null));
}
function U(n, l) {
  R(n, l, U);
}
function W(l, u, t) {
  var i,
    r,
    o,
    e,
    f = m({}, l.props);
  for (o in (l.type && l.type.defaultProps && (e = l.type.defaultProps), u))
    "key" == o
      ? (i = u[o])
      : "ref" == o
        ? (r = u[o])
        : (f[o] = void 0 === u[o] && null != e ? e[o] : u[o]);
  return (
    arguments.length > 2 &&
      (f.children = arguments.length > 3 ? n.call(arguments, 2) : t),
    x(l.type, f, i || l.key, r || l.ref, null)
  );
}
function X(n) {
  function l(n) {
    var u, t;
    return (
      this.getChildContext ||
        ((u = new Set()),
        ((t = {})[l.__c] = this),
        (this.getChildContext = function () {
          return t;
        }),
        (this.componentWillUnmount = function () {
          u = null;
        }),
        (this.shouldComponentUpdate = function (n) {
          this.props.value != n.value &&
            u.forEach(function (n) {
              ((n.__e = !0), A(n));
            });
        }),
        (this.sub = function (n) {
          u.add(n);
          var l = n.componentWillUnmount;
          n.componentWillUnmount = function () {
            (u && u.delete(n), l && l.call(n));
          };
        })),
      n.children
    );
  }
  return (
    (l.__c = "__cC" + y++),
    (l.__ = n),
    (l.Provider =
      l.__l =
      (l.Consumer = function (n, l) {
        return n.children(l);
      }).contextType =
        l),
    l
  );
}
((n = w.slice),
  (l = {
    __e: function (n, l, u, t) {
      for (var i, r, o; (l = l.__);)
        if ((i = l.__c) && !i.__)
          try {
            if (
              ((r = i.constructor) &&
                null != r.getDerivedStateFromError &&
                (i.setState(r.getDerivedStateFromError(n)), (o = i.__d)),
              null != i.componentDidCatch &&
                (i.componentDidCatch(n, t || {}), (o = i.__d)),
              o)
            )
              return (i.__E = i);
          } catch (l) {
            n = l;
          }
      throw n;
    },
  }),
  (u = 0),
  (t = function (n) {
    return null != n && void 0 === n.constructor;
  }),
  (C.prototype.setState = function (n, l) {
    var u;
    ((u =
      null != this.__s && this.__s != this.state
        ? this.__s
        : (this.__s = m({}, this.state))),
      "function" == typeof n && (n = n(m({}, u), this.props)),
      n && m(u, n),
      null != n && this.__v && (l && this._sb.push(l), A(this)));
  }),
  (C.prototype.forceUpdate = function (n) {
    this.__v && ((this.__e = !0), n && this.__h.push(n), A(this));
  }),
  (C.prototype.render = S),
  (i = []),
  (o =
    "function" == typeof Promise
      ? Promise.prototype.then.bind(Promise.resolve())
      : setTimeout),
  (e = function (n, l) {
    return n.__v.__b - l.__v.__b;
  }),
  (H.__r = 0),
  (f = Math.random().toString(8)),
  (c = "__d" + f),
  (a = "__a" + f),
  (s = /(PointerCapture)$|Capture$/i),
  (h = 0),
  (p = V(!1)),
  (v = V(!0)),
  (y = 0));
export {
  C as Component,
  S as Fragment,
  W as cloneElement,
  X as createContext,
  k as createElement,
  M as createRef,
  k as h,
  U as hydrate,
  t as isValidElement,
  l as options,
  R as render,
  F as toChildArray,
};
//# sourceMappingURL=preact.module.js.map
