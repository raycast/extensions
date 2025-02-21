import { NestCamera } from "../../types";

export const mockCameras: NestCamera[] = [
  {
    id: "mock-camera-1",
    name: "Front Door Camera",
    roomHint: "Front Door",
    traits: {
      streamingSupport: "WEB_RTC",
      online: true
    }
  },
  {
    id: "mock-camera-2",
    name: "Back Yard Camera",
    roomHint: "Back Yard",
    traits: {
      streamingSupport: "WEB_RTC",
      online: true
    }
  },
  {
    id: "mock-camera-3",
    name: "Garage Camera",
    roomHint: "Garage",
    traits: {
      streamingSupport: "WEB_RTC",
      online: false
    }
  }
];

export async function getMockCameras(): Promise<NestCamera[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockCameras;
} 