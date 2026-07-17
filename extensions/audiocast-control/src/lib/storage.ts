import { LocalStorage } from '@raycast/api';

export enum StorageKey {
  DEVICE_IP = 'AUDIOCAST_DEVICE_IP',
  DEVICE_NAME = 'AUDIOCAST_DEVICE_NAME'
}

class Storage {
  async getDeviceIp(): Promise<string | undefined> {
    return await LocalStorage.getItem<string>(StorageKey.DEVICE_IP);
  }

  async saveDeviceIp(ip: string): Promise<void> {
    return await LocalStorage.setItem(StorageKey.DEVICE_IP, ip);
  }

  async removeDeviceIp(): Promise<void> {
    return await LocalStorage.removeItem(StorageKey.DEVICE_IP);
  }

  async getDeviceName(): Promise<string | undefined> {
    return await LocalStorage.getItem<string>(StorageKey.DEVICE_NAME);
  }

  async saveDeviceName(name: string): Promise<void> {
    return await LocalStorage.setItem(StorageKey.DEVICE_NAME, name);
  }

  async removeDeviceName(): Promise<void> {
    return await LocalStorage.removeItem(StorageKey.DEVICE_NAME);
  }
}

export const storage = new Storage();
