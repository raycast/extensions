import os from "node:os";
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as discovery from "./discovery";
import * as ssdp from "./ssdp";
import { WiiMDevice } from "./types";
import {
  getManualDeviceIP,
  getSelectedDeviceIP,
  getCachedDeviceIP,
  isCacheValid,
  setCachedDeviceIP,
} from "./preferences";
import { WiiMAPIError } from "./errors";

jest.mock("./preferences", () => ({
  getManualDeviceIP: jest.fn(),
  getSelectedDeviceIP: jest.fn(),
  getCachedDeviceIP: jest.fn(),
  isCacheValid: jest.fn(),
  setCachedDeviceIP: jest.fn(),
}));

jest.mock("./ssdp", () => ({
  ...jest.requireActual<typeof import("./ssdp")>("./ssdp"),
  broadcastDiscover: jest.fn(),
}));

describe("Wiim  - Discovery", () => {
  const loopbackInterface: {
    address: string;
    netmask: string;
    family: string;
    internal: boolean;
    mac: string;
    scopeid: undefined;
    cidr: string;
  } = {
    address: "127.0.0.1",
    netmask: "255.0.0.0",
    family: "IPv4",
    internal: true,
    mac: "00:00:00:00:00:00",
    scopeid: undefined,
    cidr: "127.0.0.1/8",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getLocalIP", () => {
    test("should return the first non-loopback IPv4 address", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
        eth0: [
          {
            address: "192.168.1.100",
            netmask: "255.255.255.0",
            family: "IPv4",
            internal: false,
            mac: "00:11:22:33:44:55",
            scopeid: undefined,
            cidr: "192.168.1.100/24",
          },
        ],
      };

      jest
        .spyOn(os, "networkInterfaces")
        .mockReturnValue(mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>);

      const ip = discovery.getLocalIP();
      expect(ip).toBe("192.168.1.100");
    });

    test("should return undefined when no non-loopback IPv4 addresses are found", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
      };

      jest
        .spyOn(os, "networkInterfaces")
        .mockReturnValue(mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>);

      const ip = discovery.getLocalIP();
      expect(ip).toBeUndefined();
    });
  });

  describe("getLocalSubnet", () => {
    test("should return the subnet address based on local IP", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
        eth0: [
          {
            address: "192.168.1.100",
            netmask: "255.255.255.0",
            family: "IPv4",
            internal: false,
            mac: "00:11:22:33:44:55",
            scopeid: undefined,
            cidr: "192.168.1.100/24",
          },
        ],
      };

      jest
        .spyOn(os, "networkInterfaces")
        .mockReturnValue(mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>);

      const subnet = discovery.getLocalSubnet();
      expect(subnet).toBe("192.168.1.0");
    });

    test("should return undefined when local IP is not found", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
      };

      jest
        .spyOn(os, "networkInterfaces")
        .mockReturnValue(mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>);

      const subnet = discovery.getLocalSubnet();
      expect(subnet).toBeUndefined();
    });
  });

  describe("resolveDevice", () => {
    test("should return manual IP when set", async () => {
      const mockManualIP = "192.168.1.100";
      (getManualDeviceIP as jest.Mock).mockReturnValue(mockManualIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockManualIP, port: 443 });
      expect(getSelectedDeviceIP).not.toHaveBeenCalled();
      expect(isCacheValid).not.toHaveBeenCalled();
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should return selected IP when set and no manual IP", async () => {
      (getManualDeviceIP as jest.Mock).mockReturnValue(undefined);
      const mockSelectedIP = "192.168.1.101";
      (getSelectedDeviceIP as jest.Mock).mockReturnValue(mockSelectedIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockSelectedIP, port: 443 });
      expect(isCacheValid).not.toHaveBeenCalled();
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should return cached IP when valid and no manual or selected IP", async () => {
      (getManualDeviceIP as jest.Mock).mockReturnValue(undefined);
      (getSelectedDeviceIP as jest.Mock).mockReturnValue(undefined);
      (isCacheValid as jest.Mock).mockReturnValue(true);
      const mockCachedIP = "192.168.1.102";
      (getCachedDeviceIP as jest.Mock).mockReturnValue(mockCachedIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockCachedIP, port: 443 });
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should discover device when no manual, selected, or cached IP", async () => {
      (getManualDeviceIP as jest.Mock).mockReturnValue(undefined);
      (getSelectedDeviceIP as jest.Mock).mockReturnValue(undefined);
      (isCacheValid as jest.Mock).mockReturnValue(false);
      const mockDiscoveredDevice: WiiMDevice = { ip: "192.168.1.103", port: 443 };
      (ssdp.broadcastDiscover as jest.Mock<() => Promise<WiiMDevice>>).mockResolvedValueOnce(mockDiscoveredDevice);
      (setCachedDeviceIP as jest.Mock).mockReturnValue(undefined);

      const result = await discovery.resolveDevice();
      expect(result).toEqual(mockDiscoveredDevice);
      expect(setCachedDeviceIP).toHaveBeenCalledWith(mockDiscoveredDevice.ip);
    });

    test("should throw error when no device found in discovery", async () => {
      (getManualDeviceIP as jest.Mock).mockReturnValue(undefined);
      (getSelectedDeviceIP as jest.Mock).mockReturnValue(undefined);
      (isCacheValid as jest.Mock).mockReturnValue(false);
      (ssdp.broadcastDiscover as jest.Mock<() => Promise<WiiMDevice>>).mockRejectedValue(
        new WiiMAPIError("DISCOVERY_FAILED", "No device found"),
      );

      await expect(discovery.resolveDevice()).rejects.toThrow(expect.any(WiiMAPIError));
    });
  });
});
