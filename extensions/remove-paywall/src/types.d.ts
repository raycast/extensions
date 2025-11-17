interface Preferences {
  service?: string;
}

declare namespace Arguments {
  interface RemovePaywall {
    url?: string;
    service?: string;
  }
}

// This is a global ambient declaration file used by TypeScript for Raycast
