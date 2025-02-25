import { LocalStorage } from "@raycast/api";
import { NestCamera } from "../../types";

const QUICK_ACCESS_CAMERA_KEY = "quickAccessCameraId";

export class QuickAccessService {
  private static instance: QuickAccessService;

  private constructor() {}

  public static getInstance(): QuickAccessService {
    if (!QuickAccessService.instance) {
      QuickAccessService.instance = new QuickAccessService();
    }
    return QuickAccessService.instance;
  }

  /**
   * Set a camera as the quick access camera
   * @param camera The camera to set as quick access
   */
  public async setQuickAccessCamera(camera: NestCamera): Promise<void> {
    await LocalStorage.setItem(QUICK_ACCESS_CAMERA_KEY, camera.id);
  }

  /**
   * Get the ID of the quick access camera
   * @returns The ID of the quick access camera, or null if not set
   */
  public async getQuickAccessCameraId(): Promise<string | null> {
    const cameraId = await LocalStorage.getItem<string>(QUICK_ACCESS_CAMERA_KEY);
    return cameraId || null;
  }

  /**
   * Check if a camera is set as the quick access camera
   * @param cameraId The camera ID to check
   * @returns True if the camera is set as quick access, false otherwise
   */
  public async isQuickAccessCamera(cameraId: string): Promise<boolean> {
    const quickAccessId = await this.getQuickAccessCameraId();
    return quickAccessId === cameraId;
  }

  /**
   * Clear the quick access camera setting
   */
  public async clearQuickAccessCamera(): Promise<void> {
    await LocalStorage.removeItem(QUICK_ACCESS_CAMERA_KEY);
  }
}
