(() => {
  const previous = window.__agentFeedbackDomCapture;
  if (previous?.token === "__AGENT_FEEDBACK_SESSION_TOKEN__") return;
  previous?.stop?.();

  const currentScript = document.currentScript;
  const bridgeOrigin = new URL(
    currentScript?.src || "http://127.0.0.1:43127/agent-feedback.js",
  ).origin;
  const sessionToken = "__AGENT_FEEDBACK_SESSION_TOKEN__";
  const dwellMs = 300;
  const attributeNames = [
    "id",
    "data-testid",
    "data-test",
    "data-cy",
    "data-component",
    "data-slot",
    "data-variant",
    "data-state",
    "name",
    "role",
    "aria-label",
    "href",
    "type",
    "title",
    "placeholder",
  ];

  const host = document.createElement("div");
  host.dataset.agentFeedbackIgnore = "true";
  host.style.cssText =
    "all:initial;position:fixed;top:0;right:0;pointer-events:none;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    #badge { position: fixed; top: 12px; right: 12px; padding: 6px 9px; color: #fff; background: rgba(23,23,25,.92); border: 1px solid rgba(255,255,255,.16); border-radius: 999px; box-shadow: 0 4px 16px rgba(0,0,0,.24); backdrop-filter: blur(8px); font: 600 11px/1 system-ui, -apple-system, sans-serif; letter-spacing: .01em; white-space: nowrap; }
    #dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: #45c46b; border-radius: 50%; vertical-align: 0; }
  `;
  const badge = document.createElement("div");
  badge.id = "badge";
  badge.innerHTML = '<span id="dot"></span>AF recording';
  shadow.append(style, badge);
  document.documentElement.appendChild(host);

  const clientId =
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let pendingElement = null;
  let pendingTimer = null;
  let activeElement = null;
  let stopped = false;

  function escapeCss(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(
      /[^a-zA-Z0-9_-]/g,
      (character) => `\\${character}`,
    );
  }

  function clean(value, maximum = 160) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function isInspectable(element) {
    return (
      element instanceof Element &&
      element !== document.documentElement &&
      element !== document.body &&
      !element.closest("[data-agent-feedback-ignore]")
    );
  }

  function classNames(element) {
    return Array.from(element.classList || []).filter(Boolean).slice(0, 12);
  }

  function attributes(element) {
    const result = {};
    for (const name of attributeNames) {
      if (!element.hasAttribute(name)) continue;
      let value = clean(element.getAttribute(name), 120);
      if (name === "href" && value) {
        try {
          const url = new URL(value, location.href);
          value = `${url.origin === location.origin ? "" : url.origin}${url.pathname}`;
        } catch {}
      }
      if (value) result[name] = value;
    }
    return result;
  }

  function signature(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes = classNames(element)
      .slice(0, 3)
      .map((name) => `.${name}`)
      .join("");
    const testId = element.getAttribute("data-testid");
    return clean(
      `${tag}${id}${classes}${testId ? `[data-testid="${testId}"]` : ""}`,
      240,
    );
  }

  function isUnique(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function selectorFor(element) {
    if (element.id) {
      const byId = `#${escapeCss(element.id)}`;
      if (isUnique(byId)) return byId;
    }
    for (const name of [
      "data-testid",
      "data-test",
      "data-cy",
      "name",
      "aria-label",
    ]) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const escapedValue = value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/[\n\r]/g, " ");
      const candidate = `${element.tagName.toLowerCase()}[${name}="${escapedValue}"]`;
      if (isUnique(candidate)) return candidate;
    }
    const segments = [];
    let current = element;
    while (current && current !== document.body && segments.length < 5) {
      let segment = current.tagName.toLowerCase();
      const classes = classNames(current).slice(0, 2);
      if (classes.length)
        segment += classes.map((name) => `.${escapeCss(name)}`).join("");
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName,
        );
        if (siblings.length > 1)
          segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      segments.unshift(segment);
      const candidate = segments.join(" > ");
      if (isUnique(candidate)) return candidate;
      current = parent;
    }
    return segments.join(" > ");
  }

  function readableText(element) {
    const tag = element.tagName.toLowerCase();
    if (
      ["input", "textarea", "select"].includes(tag) ||
      element.isContentEditable
    )
      return "";
    return clean(element.innerText || element.textContent, 240);
  }

  function pageUrl() {
    return `${location.origin}${location.pathname}`;
  }

  function eventBase(kind) {
    return {
      kind,
      clientId,
      capturedAt: new Date().toISOString(),
      timestampMs: Date.now(),
      pageUrl: pageUrl(),
      visibilityState: document.visibilityState,
      focused: document.hasFocus(),
    };
  }

  function fingerprint(element) {
    const rect = element.getBoundingClientRect();
    const ancestors = [];
    let parent = element.parentElement;
    while (parent && parent !== document.body && ancestors.length < 4) {
      ancestors.push(signature(parent));
      parent = parent.parentElement;
    }
    return {
      ...eventBase("hover"),
      tag: element.tagName.toLowerCase(),
      signature: signature(element),
      selector: selectorFor(element),
      text: readableText(element),
      attributes: attributes(element),
      classNames: classNames(element),
      ancestors,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  async function send(event) {
    if (stopped) return;
    try {
      const response = await fetch(`${bridgeOrigin}/events`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Feedback-Token": sessionToken,
        },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error(String(response.status));
      host.style.display = "block";
    } catch {
      host.style.display = "none";
    }
  }

  function activate(element) {
    if (
      pendingElement !== element ||
      !isInspectable(element) ||
      !element.isConnected
    )
      return;
    activeElement = element;
    void send(fingerprint(element));
  }

  function clearActiveTarget() {
    if (!activeElement) return;
    activeElement = null;
    void send(eventBase("clear"));
  }

  function onPointerMove(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!isInspectable(element)) {
      pendingElement = null;
      clearTimeout(pendingTimer);
      clearActiveTarget();
      return;
    }
    if (pendingElement === element) return;
    pendingElement = element;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => activate(element), dwellMs);
  }

  document.addEventListener("pointermove", onPointerMove, true);
  const heartbeat = setInterval(() => void send(eventBase("heartbeat")), 2000);
  void send(eventBase("hello"));

  window.__agentFeedbackDomCapture = {
    token: sessionToken,
    stop() {
      stopped = true;
      clearTimeout(pendingTimer);
      clearInterval(heartbeat);
      document.removeEventListener("pointermove", onPointerMove, true);
      host.remove();
    },
  };
})();
