// Simple event emitter for template updates
import { environment } from "@raycast/api";

class TemplateEventEmitter {
  private listeners: Array<() => void> = [];

  addListener(callback: () => void) {
    if (environment.isDevelopment) console.log("Template event listener added, total:", this.listeners.length + 1);
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
      if (environment.isDevelopment) console.log("Template event listener removed, remaining:", this.listeners.length);
    };
  }

  emit() {
    if (environment.isDevelopment) console.log("Template update event emitted to", this.listeners.length, "listeners");
    this.listeners.forEach((callback) => callback());
  }
}

export const templateEvents = new TemplateEventEmitter();
