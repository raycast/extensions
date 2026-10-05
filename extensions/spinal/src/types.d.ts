/// <reference types="@raycast/api" />

declare module "@raycast/api" {
  interface LaunchProps {
    launchContext?: {
      collectionId?: string;
      body?: string;
    };
  }
}

export {};
