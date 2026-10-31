import { spawn } from "node:child_process";
import {
  DictationAppearance,
  defaultDictationAppearance,
  dictationPanelOrigin,
  normalizeDictationAppearance,
} from "./dictation-appearance";

export type DictationVisualizer = {
  ready: Promise<boolean>;
  level: (value: number) => void;
  processing: () => void;
  close: () => Promise<void>;
};

const visualizerScript = String.raw`
ObjC.import("AppKit");
ObjC.import("Foundation");
ObjC.import("QuartzCore");

function runVisualizer(appearance) {
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  const screen = $.NSScreen.mainScreen;
  if (!screen) return;

  const width = 160;
  const height = 136;
  const padding = 6;
  const scale = 0.8;
  const panelWidth = width * scale;
  const panelHeight = (height + padding * 2) * scale;
  const visible = screen.visibleFrame;
  const origin = (${dictationPanelOrigin.toString()})(
    {
      x: Number(visible.origin.x),
      y: Number(visible.origin.y),
      width: Number(visible.size.width),
      height: Number(visible.size.height),
    },
    { width: panelWidth, height: panelHeight },
    appearance,
  );
  const panel = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer(
    $.NSMakeRect(
      Math.round(origin.x),
      Math.round(origin.y),
      panelWidth,
      panelHeight,
    ),
    $.NSWindowStyleMaskBorderless,
    $.NSBackingStoreBuffered,
    false,
  );
  panel.setOpaque(false);
  panel.setBackgroundColor($.NSColor.clearColor);
  panel.setHasShadow(false);
  panel.setHidesOnDeactivate(false);
  panel.setIgnoresMouseEvents(true);
  panel.setLevel($.NSStatusWindowLevel);
  panel.setCollectionBehavior(
    Number($.NSWindowCollectionBehaviorCanJoinAllSpaces) |
      Number($.NSWindowCollectionBehaviorFullScreenAuxiliary),
  );

  const traces = [
    {
      phase: 0.3,
      speed: 0.67,
      frequency: 0.85,
      amplitude: 0.88,
      color: [1, 0.22, 0.5],
    },
    {
      phase: 1.65,
      speed: -0.84,
      frequency: 0.96,
      amplitude: 0.94,
      color: [0.72, 0.3, 1],
    },
    {
      phase: 3.1,
      speed: 1,
      frequency: 1.08,
      amplitude: 1,
      color: [0.3, 0.65, 1],
    },
    {
      phase: 4.55,
      speed: 0.79,
      frequency: 0.94,
      amplitude: 0.9,
      color: [0.12, 0.9, 0.95],
    },
    {
      phase: 5.75,
      speed: -1.12,
      frequency: 1.17,
      amplitude: 0.82,
      color: [1, 0.64, 0.16],
    },
  ];
  const traceCount = traces.length;
  const middle = (traceCount - 1) / 2;
  const traceOrder = [];
  for (let index = 0; index < traceCount; index += 1) traceOrder.push(index);
  traceOrder.sort(
    (left, right) => Math.abs(right - middle) - Math.abs(left - middle),
  );
  const pointCount = 64;
  let lastFrame = Date.now();
  let elapsed = 0;
  let visualizerLevel = 0;
  let visualizerProcessing = false;
  let fadeStarted;

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function motion(minimum, maximum, shortest, longest) {
    return {
      minimum,
      maximum,
      shortest,
      longest,
      from: randomBetween(minimum, maximum),
      to: randomBetween(minimum, maximum),
      started: 0,
      duration: randomBetween(shortest, longest),
    };
  }

  function motionValue(state) {
    while (elapsed >= state.started + state.duration) {
      state.from = state.to;
      state.started += state.duration;
      state.to = randomBetween(state.minimum, state.maximum);
      state.duration = randomBetween(state.shortest, state.longest);
    }
    const progress = Math.min(1, (elapsed - state.started) / state.duration);
    const blend =
      progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    return state.from + (state.to - state.from) * blend;
  }

  for (const [index, trace] of traces.entries()) {
    trace.offset = trace.phase;
    trace.height = motion(0.45, 1.05, 750, 2400);
    trace.thickness = motion(0.35, 1.8, 600, 2100);
    trace.tempo = motion(0.7, 1.3, 1400, 3400);
    trace.energy = 0;
    trace.processing = 0;
    trace.attack = 55 + index * 13 + randomBetween(0, 15);
    trace.release = 195 + index * 67.5 + randomBetween(0, 30);
  }

  const bubbleRadius = 52;
  const bubbleDrift = motion(0, 1, 1800, 4600);
  const bubbleModes = [
    { order: 2, weight: 0.56, phase: 0.4, speed: 0.82 },
    { order: 3, weight: 0.3, phase: 2.1, speed: -0.63 },
    { order: 4, weight: 0.14, phase: 4.8, speed: 0.41 },
  ];
  for (const mode of bubbleModes) mode.tempo = motion(0.65, 1.35, 2200, 5100);
  let bubbleEnergy = 0;
  let bubbleDeformation = 0;
  let bubbleExpansion = 0;

  function bubblePoint(angle, padding) {
    let radius = bubbleRadius + bubbleExpansion + padding;
    let slope = 0;
    for (const mode of bubbleModes) {
      const phase = mode.order * angle + mode.phase;
      radius += bubbleDeformation * mode.weight * Math.sin(phase);
      slope += bubbleDeformation * mode.weight * mode.order * Math.cos(phase);
    }
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      x: width / 2 + radius * cosine,
      y: height / 2 + radius * sine,
      dx: slope * cosine - radius * sine,
      dy: slope * sine + radius * cosine,
    };
  }

  function bubblePath(padding, start, end) {
    const path = $.NSBezierPath.bezierPath;
    const segments = Math.ceil((end - start) / (Math.PI / 12));
    const step = (end - start) / segments;
    let previous = bubblePoint(start, padding);
    path.moveToPoint($.NSMakePoint(previous.x, previous.y));
    for (let segment = 1; segment <= segments; segment += 1) {
      const next = bubblePoint(start + step * segment, padding);
      path.curveToPointControlPoint1ControlPoint2(
        $.NSMakePoint(next.x, next.y),
        $.NSMakePoint(
          previous.x + (previous.dx * step) / 3,
          previous.y + (previous.dy * step) / 3,
        ),
        $.NSMakePoint(
          next.x - (next.dx * step) / 3,
          next.y - (next.dy * step) / 3,
        ),
      );
      previous = next;
    }
    if (end - start >= Math.PI * 2) path.closePath;
    return path;
  }

  function color(red, green, blue, alpha) {
    return $.NSColor.colorWithCalibratedRedGreenBlueAlpha(
      red,
      green,
      blue,
      alpha,
    );
  }

  function gradient(stops) {
    const colors = $.NSMutableArray.alloc.init;
    for (const stop of stops) colors.addObject(color.apply(null, stop));
    return $.NSGradient.alloc.initWithColors(colors);
  }

  function oval(x, y, width, height) {
    return $.NSBezierPath.bezierPathWithOvalInRect(
      $.NSMakeRect(x, y, width, height),
    );
  }

  function ribbonGradient(trace, processing) {
    const mix = traces.indexOf(trace) / (traceCount - 1);
    const red =
      trace.color[0] + (0.66 + mix * 0.1 - trace.color[0]) * processing;
    const green =
      trace.color[1] + (0.18 + mix * 0.1 - trace.color[1]) * processing;
    const blue = trace.color[2] + (1 - trace.color[2]) * processing;
    trace.tint = [red, green, blue];
    trace.bloom = gradient([
      [red, green, blue, 0.23],
      [red, green, blue, 0.08],
      [red, green, blue, 0],
    ]);
    return gradient([
      [red, green, blue, 0],
      [red, green, blue, 0.28],
      [
        red + (1 - red) * 0.15,
        green + (1 - green) * 0.15,
        blue + (1 - blue) * 0.15,
        0.82,
      ],
      [red, green, blue, 0.28],
      [red, green, blue, 0],
    ]);
  }

  const shellGradient = gradient([
    [0.12, 0.19, 0.25, 0.74],
    [0.025, 0.038, 0.065, 0.96],
    [0.004, 0.006, 0.013, 0.99],
  ]);
  const haloGradient = gradient([
    [0.18, 0.39, 0.82, 0.18],
    [0.15, 0.32, 0.7, 0.07],
    [0.15, 0.32, 0.7, 0],
  ]);
  const lowerGlowGradient = gradient([
    [0.19, 0.68, 1, 0.15],
    [0.11, 0.4, 0.8, 0.04],
    [0.11, 0.4, 0.8, 0],
  ]);
  const lowerGlow = oval(34, 18, 92, 66);
  const highlightGradient = gradient([
    [0.82, 0.96, 1, 0.1],
    [0.82, 0.96, 1, 0.02],
    [0.82, 0.96, 1, 0],
  ]);
  const topHighlight = oval(49, 107, 62, 10);
  const whiteGradient = gradient([
    [1, 1, 1, 0.9],
    [0.72, 0.97, 1, 0.3],
    [0.65, 0.89, 1, 0],
  ]);
  const bowl = $.NSBezierPath.bezierPath;
  bowl.moveToPoint($.NSMakePoint(33, 64));
  bowl.curveToPointControlPoint1ControlPoint2(
    $.NSMakePoint(127, 64),
    $.NSMakePoint(44, 3),
    $.NSMakePoint(116, 3),
  );
  bowl.curveToPointControlPoint1ControlPoint2(
    $.NSMakePoint(33, 64),
    $.NSMakePoint(116, 38),
    $.NSMakePoint(44, 38),
  );
  bowl.closePath;
  const bowlGradient = gradient([
    [0.63, 0.85, 0.94, 0.16],
    [0.43, 0.67, 0.9, 0.08],
    [0.43, 0.67, 0.9, 0],
  ]);
  for (const trace of traces) {
    trace.gradient = ribbonGradient(trace, 0);
    trace.cachedProcessing = 0;
  }

  ObjC.registerSubclass({
    name: "RaycastDictationBubbleView",
    superclass: "NSView",
    methods: {
      "drawRect:": function () {
        const now = Date.now();
        const delta = Math.max(0, Math.min(100, now - lastFrame));
        lastFrame = now;
        elapsed += delta;
        const targetEnergy = Math.pow(visualizerLevel, 0.58);
        const response = targetEnergy > bubbleEnergy ? 90 : 320;
        bubbleEnergy +=
          (targetEnergy - bubbleEnergy) * (1 - Math.exp(-delta / response));
        const targetExpansion = visualizerProcessing ? 0 : targetEnergy * 4;
        const expansionResponse = targetExpansion > bubbleExpansion ? 65 : 110;
        bubbleExpansion +=
          (targetExpansion - bubbleExpansion) *
          (1 - Math.exp(-delta / expansionResponse));
        if (targetExpansion === 0 && bubbleExpansion < 0.01)
          bubbleExpansion = 0;
        const drift = motionValue(bubbleDrift);
        bubbleDeformation = 2.4 + drift * 0.2 + bubbleEnergy * 0.95;
        const bubbleSpeed = 2.1 + drift * 0.3 + bubbleEnergy * 3;
        for (const mode of bubbleModes)
          mode.phase +=
            (delta / 1000) * bubbleSpeed * mode.speed * motionValue(mode.tempo);
        const bubble = bubblePath(0, 0, Math.PI * 2);
        const halo = bubblePath(10, 0, Math.PI * 2);
        const lowerRim = bubblePath(0, Math.PI, Math.PI * 2);
        bubble.setLineWidth(0.5);
        lowerRim.setLineWidth(0.65);
        if (fadeStarted !== undefined) {
          const fade = Math.min(1, (now - fadeStarted) / 240);
          panel.setAlphaValue(1 - fade * fade * (3 - 2 * fade));
        }
        haloGradient.drawInBezierPathRelativeCenterPosition(
          halo,
          $.NSMakePoint(0, -0.12),
        );
        shellGradient.drawInBezierPathAngle(bubble, 90);
        $.NSGraphicsContext.saveGraphicsState;
        bubble.addClip;
        lowerGlowGradient.drawInBezierPathRelativeCenterPosition(
          lowerGlow,
          $.NSMakePoint(0, 0.15),
        );
        let totalEnergy = 0;
        for (const index of traceOrder) {
          const trace = traces[index];
          const response =
            targetEnergy > trace.energy ? trace.attack : trace.release;
          trace.energy +=
            (targetEnergy - trace.energy) * (1 - Math.exp(-delta / response));
          trace.processing +=
            ((visualizerProcessing ? 1 : 0) - trace.processing) *
            (1 - Math.exp(-delta / 160));
          trace.phase += (delta / 340) * trace.speed * motionValue(trace.tempo);
          if (Math.abs(trace.processing - trace.cachedProcessing) > 0.012) {
            trace.gradient = ribbonGradient(trace, trace.processing);
            trace.cachedProcessing = trace.processing;
          }
          const energy = trace.energy;
          totalEnergy += energy;
          const phase = trace.phase;
          const depth = (index - middle) / middle;
          const mix = index / (traceCount - 1);
          const thickness = motionValue(trace.thickness);
          const amplitude =
            (3 + energy * 22) * trace.amplitude * motionValue(trace.height);
          const centerWidth = (2.4 + energy * 12) * (0.4 + thickness * 0.65);
          const upper = [];
          const lower = [];
          let centerY = height / 2;
          for (let point = 0; point < pointCount; point += 1) {
            const progress = point / (pointCount - 1);
            const envelope = Math.pow(Math.sin(Math.PI * progress), 1.05);
            const primary = Math.sin(
              progress * Math.PI * 2.2 * trace.frequency + phase,
            );
            const detail = Math.sin(
              progress * Math.PI * (3.3 + mix * 0.6) -
                phase * 0.45 +
                trace.offset * 1.7,
            );
            const drift = Math.sin(
              progress * Math.PI * 1.2 - phase * 0.3 + trace.offset,
            );
            const wave = primary * 0.75 + detail * 0.18 + drift * 0.12;
            const center =
              height / 2 +
              envelope * (amplitude * wave + depth * (1 + energy * 3));
            if (point === Math.floor(pointCount / 2)) centerY = center;
            const spread =
              centerWidth * Math.pow(Math.sin(Math.PI * progress), 1.5);
            const asymmetry =
              0.5 + 0.13 * Math.sin(phase * 0.48 + progress * Math.PI);
            const xPosition =
              width / 2 +
              (progress - 0.5) * (bubbleRadius + bubbleExpansion - 4) * 2;
            upper.push($.NSMakePoint(xPosition, center + spread * asymmetry));
            lower.push(
              $.NSMakePoint(xPosition, center - spread * (1 - asymmetry)),
            );
          }
          const ribbon = $.NSBezierPath.bezierPath;
          ribbon.moveToPoint(upper[0]);
          for (let point = 1; point < pointCount; point += 1)
            ribbon.lineToPoint(upper[point]);
          for (let point = pointCount - 1; point >= 0; point -= 1)
            ribbon.lineToPoint(lower[point]);
          ribbon.closePath;
          const bloomHeight = 20 + energy * 22;
          trace.bloom.drawInBezierPathRelativeCenterPosition(
            oval(37, centerY - bloomHeight / 2, 86, bloomHeight),
            $.NSMakePoint(0, 0),
          );
          $.NSGraphicsContext.saveGraphicsState;
          const shadow = $.NSShadow.alloc.init;
          shadow.setShadowColor(
            color(trace.tint[0], trace.tint[1], trace.tint[2], 0.68),
          );
          shadow.setShadowBlurRadius(7 + energy * 5 + thickness);
          shadow.setShadowOffset($.NSMakeSize(0, 0));
          shadow.set;
          color(trace.tint[0], trace.tint[1], trace.tint[2], 0.06).setFill;
          ribbon.fill;
          $.NSGraphicsContext.restoreGraphicsState;
          trace.gradient.drawInBezierPathAngle(ribbon, 90);
        }
        const averageEnergy = totalEnergy / traceCount;
        const coreWidth = 30 + averageEnergy * 29;
        const coreHeight = 3 + averageEnergy * 16;
        const core = oval(
          (width - coreWidth) / 2,
          height / 2 - coreHeight / 2,
          coreWidth,
          coreHeight,
        );
        whiteGradient.drawInBezierPathRelativeCenterPosition(
          core,
          $.NSMakePoint(0, 0),
        );
        bowlGradient.drawInBezierPathAngle(bowl, 90);
        highlightGradient.drawInBezierPathRelativeCenterPosition(
          topHighlight,
          $.NSMakePoint(-0.14, 0.1),
        );
        $.NSGraphicsContext.restoreGraphicsState;
        color(0.68, 0.84, 1, 0.2).setStroke;
        bubble.stroke;
        color(0.65, 0.9, 1, 0.34 + averageEnergy * 0.14).setStroke;
        lowerRim.stroke;
      },
    },
  });

  const canvas = $.RaycastDictationBubbleView.alloc.initWithFrame(
    $.NSMakeRect(0, 0, panelWidth, panelHeight),
  );
  canvas.setBounds($.NSMakeRect(0, -padding, width, height + padding * 2));
  canvas.setWantsLayer(true);
  canvas.layer.setBackgroundColor(
    $.NSColor.colorWithCalibratedRedGreenBlueAlpha(0, 0, 0, 0.001).CGColor,
  );
  panel.setContentView(canvas);

  function draw(level) {
    const value = Math.max(0, Math.min(1, Number(level) || 0));
    visualizerLevel = value;
    canvas.setNeedsDisplay(true);
    canvas.display;
  }

  panel.orderFrontRegardless;
  draw(0);
  console.log("raycast-visualizer-ready");
  $.NSRunLoop.currentRunLoop.runUntilDate(
    $.NSDate.dateWithTimeIntervalSinceNow(0.02),
  );

  const input = $.NSFileHandle.fileHandleWithStandardInput;
  let pending = "";
  let stopped = false;
  while (!stopped) {
    const data = input.availableData;
    if (Number(data.length) === 0) break;
    pending += ObjC.unwrap(
      $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding),
    );
    const lines = pending.split("\n");
    pending = lines.pop() || "";
    let nextLevel;
    for (const line of lines) {
      if (line === "stop") {
        stopped = true;
        break;
      }
      if (line === "processing") {
        visualizerProcessing = true;
        nextLevel = 0.4;
        continue;
      }
      if (line === "fade") {
        fadeStarted = Date.now();
        nextLevel = 0;
        continue;
      }
      nextLevel = Number(line);
    }
    if (!stopped && nextLevel !== undefined) draw(nextLevel);
    $.NSRunLoop.currentRunLoop.runUntilDate(
      $.NSDate.dateWithTimeIntervalSinceNow(0.008),
    );
  }
  panel.orderOut(null);
}

function run(args) {
  runVisualizer(JSON.parse(args[0]));
}
`;

/** A small floating bubble that never takes focus from the current app. */
export function startDictationVisualizer(
  appearance: DictationAppearance = defaultDictationAppearance,
): DictationVisualizer {
  const child = spawn(
    "/usr/bin/osascript",
    [
      "-l",
      "JavaScript",
      "-e",
      visualizerScript,
      JSON.stringify(normalizeDictationAppearance(appearance)),
    ],
    { shell: false, windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
  );
  let closed = false;
  let readySettled = false;
  let resolveReady: (ready: boolean) => void;
  const ready = new Promise<boolean>((resolve) => {
    resolveReady = resolve;
  });
  let force: ReturnType<typeof setTimeout> | undefined;
  let closing: Promise<void> | undefined;
  let currentLevel = 0;
  let lastLevel = Date.now();
  let processing = false;
  let fading = false;
  const finished = new Promise<void>((resolve) => {
    child.once("error", () => {
      closed = true;
      if (animation) clearInterval(animation);
      if (!readySettled) {
        readySettled = true;
        resolveReady(false);
      }
      resolve();
    });
    child.once("close", () => {
      closed = true;
      if (!readySettled) {
        readySettled = true;
        resolveReady(false);
      }
      if (animation) clearInterval(animation);
      if (force) clearTimeout(force);
      resolve();
    });
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    if (!readySettled && chunk.includes("raycast-visualizer-ready")) {
      readySettled = true;
      resolveReady(true);
    } else if (!chunk.includes("raycast-visualizer-ready")) {
      console.error(chunk.trim());
    }
  });
  child.stdin.on("error", () => undefined);
  const level = (value: number) => {
    if (closed || fading || processing) return;
    currentLevel = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    lastLevel = Date.now();
  };
  const tick = () => {
    if (closed || !child.stdin.writable || child.stdin.writableNeedDrain)
      return;
    const value = fading
      ? 0
      : processing
        ? 0.4
        : Date.now() - lastLevel > 180
          ? 0
          : currentLevel;
    child.stdin.write(`${value}\n`);
  };
  const animation = setInterval(tick, 40);
  tick();

  return {
    ready,
    level,
    processing() {
      if (closed || fading || processing) return;
      processing = true;
      if (child.stdin.writable) child.stdin.write("processing\n");
    },
    close() {
      if (closing) return closing;
      if (closed) return finished;
      fading = true;
      closing = (async () => {
        if (child.stdin.writable) child.stdin.write("fade\n");
        let fadeTimer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          finished,
          new Promise<void>((resolve) => {
            fadeTimer = setTimeout(resolve, 280);
          }),
        ]);
        if (fadeTimer) clearTimeout(fadeTimer);
        if (animation) clearInterval(animation);
        if (!closed) {
          if (child.stdin.writable) child.stdin.end("stop\n");
          force = setTimeout(() => child.kill("SIGTERM"), 1_000);
        }
        await finished;
      })();
      return closing;
    },
  };
}
