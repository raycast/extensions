import { execFile } from "child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const JXA_SCRIPT = String.raw`
ObjC.import('Cocoa');
ObjC.import('Foundation');

// Stops the main NSApp run loop. NSApp.stop: only takes effect after the next
// event is processed, so we post a dummy event to force an immediate return.
function stopApp() {
  $.NSApp.stop(null);
  var ev = $.NSEvent.otherEventWithTypeLocationModifierFlagsTimestampWindowNumberContextSubtypeData1Data2(
    14, // NSEventTypeApplicationDefined
    $.NSMakePoint(0, 0),
    0,
    0,
    0,
    null,
    0,
    0,
    0
  );
  $.NSApp.postEventAtStart(ev, true);
}

if (!$.QAAirDropDelegate) {
  ObjC.registerSubclass({
    name: 'QAAirDropDelegate',
    superclass: 'NSObject',
    properties: { sourceWindow: 'id' },
    methods: {
      'sharingService:didShareItems:': {
        types: ['void', ['id', 'id']],
        implementation: function () { stopApp(); }
      },
      'sharingService:didFailToShareItems:error:': {
        types: ['void', ['id', 'id', 'id']],
        implementation: function () { stopApp(); }
      },
      'sharingService:sourceWindowForShareItems:sharingContentScope:': {
        types: ['id', ['id', 'id', 'long long']],
        implementation: function () { return this.sourceWindow; }
      }
    }
  });
}

function run(argv) {
  if (!argv || argv.length === 0) {
    throw new Error('No items to share');
  }

  var items = $.NSMutableArray.alloc.init;
  for (var i = 0; i < argv.length; i++) {
    var arg = argv[i];
    var url = /^https?:\/\//i.test(arg)
      ? $.NSURL.URLWithString(arg)
      : $.NSURL.fileURLWithPath(arg);
    if (!url || url.isNil()) {
      throw new Error('Invalid item: ' + arg);
    }
    items.addObject(url);
  }

  var app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  // -[NSApplication activate] was added in macOS 14; fall back on older systems.
  if (app.respondsToSelector('activate')) {
    app.activate;
  } else {
    app.activateIgnoringOtherApps(true);
  }

  var service = $.NSSharingService.sharingServiceNamed($.NSSharingServiceNameSendViaAirDrop);
  if (!service || service.isNil()) {
    throw new Error('AirDrop service is not available on this Mac');
  }
  if (!service.canPerformWithItems(items)) {
    throw new Error('AirDrop cannot share these items');
  }

  // Anchor window keeps the AirDrop sheet visually centered and gives
  // NSSharingService a sourceWindow to attach to.
  var window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    $.NSMakeRect(0, 0, 1, 1),
    0,
    2,
    false
  );
  window.center;
  window.level = 101;
  window.makeKeyAndOrderFront(null);

  var delegate = $.QAAirDropDelegate.alloc.init;
  delegate.sourceWindow = window;
  service.delegate = delegate;

  // Safety cap: bail after 5 minutes if the delegate never fires.
  $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(
    300, $.NSApp, 'stop:', null, false
  );

  service.performWithItems(items);

  // Pumps the full Cocoa event loop so the AirDrop sheet stays responsive.
  // Delegate methods call stopApp() once sharing finishes or is cancelled.
  app.run;

  return 'ok';
}
`;

export type AirDropItem = string;

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function fileUrlToPath(value: string): string {
  if (!value.startsWith("file://")) return value;
  return decodeURIComponent(value.replace(/^file:\/\//, ""));
}

export function writeTempTextFile(text: string, filename: string): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "quick-airdrop-"));
  const path = join(dir, filename);
  writeFileSync(path, text, "utf8");
  return {
    path,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    },
  };
}

export async function airDropItems(items: AirDropItem[]): Promise<void> {
  if (items.length === 0) {
    throw new Error("Nothing to share");
  }

  const normalized = items.map((item) => {
    if (isHttpUrl(item)) return item;
    const absolute = resolve(item);
    if (!existsSync(absolute)) {
      throw new Error(`File not found: ${item}`);
    }
    return absolute;
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const child = execFile(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", JXA_SCRIPT, "--", ...normalized],
      { maxBuffer: 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          const message = stderr?.toString().trim() || error.message;
          settle(() => rejectPromise(new Error(message)));
          return;
        }
        settle(resolvePromise);
      },
    );

    child.on("error", (err) => settle(() => rejectPromise(err)));
  });
}

export function describeItems(items: AirDropItem[]): string {
  if (items.length === 1) {
    const only = items[0];
    if (isHttpUrl(only)) return only;
    return only.split("/").pop() || only;
  }
  return `${items.length} items`;
}
