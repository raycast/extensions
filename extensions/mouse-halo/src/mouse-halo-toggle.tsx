import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);
const scriptPath = path.join(os.tmpdir(), "mouse-halo-indicator.swift");
const stateFile = path.join(os.tmpdir(), "mouse-halo.state");

const swiftCode = `
import Cocoa

class HaloWindow: NSWindow {
    init() {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 40, height: 40),
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        
        level = .floating
        backgroundColor = .clear
        isOpaque = false
        hasShadow = false
        ignoresMouseEvents = true
        
        let haloView = NSView()
        haloView.wantsLayer = true
        contentView = haloView
        
        let circle = CAShapeLayer()
        circle.path = CGPath(ellipseIn: CGRect(x: 2, y: 2, width: 36, height: 36), transform: nil)
        circle.fillColor = CGColor(red: 1, green: 0, blue: 0, alpha: 0.2)
        circle.strokeColor = CGColor(red: 1, green: 0, blue: 0, alpha: 1)
        circle.lineWidth = 2
        
        haloView.layer?.addSublayer(circle)
        
        NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] event in
            let location = NSEvent.mouseLocation
            self?.setFrameOrigin(NSPoint(x: location.x - 20, y: location.y - 20))
        }
    }
}

let app = NSApplication.shared
let window = HaloWindow()
window.makeKeyAndOrderFront(nil)
app.run()
`;

async function isHaloRunning(): Promise<boolean> {
  return fs.existsSync(stateFile);
}

async function startHalo() {
  try {
    // Create state file
    fs.writeFileSync(stateFile, "running");

    // Write Swift code to file
    fs.writeFileSync(scriptPath, swiftCode);

    // Compile and run
    await execAsync(`swiftc "${scriptPath}" -o "${scriptPath}.out"`);
    exec(`"${scriptPath}.out"`, (error) => {
      if (error && error.killed !== true) {
        console.error("Error running halo:", error);
      }
    });
  } catch (error) {
    console.error("Error starting halo:", error);
  }
}

async function stopHalo() {
  try {
    await execAsync("pkill -f mouse-halo-indicator");
    fs.unlinkSync(stateFile);
    fs.unlinkSync(`${scriptPath}.out`);
    fs.unlinkSync(scriptPath);
  } catch (error) {
    console.error("Error stopping halo:", error);
  }
}

export default async function Command() {
  try {
    const running = await isHaloRunning();
    if (running) {
      await stopHalo();
    } else {
      await startHalo();
    }
  } catch (error) {
    console.error("Error toggling mouse halo:", error);
  }

  await closeMainWindow();
}
