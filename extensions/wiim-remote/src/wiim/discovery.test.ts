import * as os from "node:os";
import { beforeEach, describe, expect, test, vi } from "vitest";
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

vi.mock("./preferences", () => ({
  getManualDeviceIP: vi.fn(),
  getSelectedDeviceIP: vi.fn(),
  getCachedDeviceIP: vi.fn(),
  isCacheValid: vi.fn(),
  setCachedDeviceIP: vi.fn(),
}));

vi.mock("./ssdp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ssdp")>();
  return { ...actual, broadcastDiscover: vi.fn() };
});

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, networkInterfaces: vi.fn(actual.networkInterfaces) };
});

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
    vi.clearAllMocks();
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

      vi.mocked(os.networkInterfaces).mockReturnValue(
        mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>,
      );

      const ip = discovery.getLocalIP();
      expect(ip).toBe("192.168.1.100");
    });

    test("should return undefined when no non-loopback IPv4 addresses are found", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
      };

      vi.mocked(os.networkInterfaces).mockReturnValue(
        mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>,
      );

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

      vi.mocked(os.networkInterfaces).mockReturnValue(
        mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>,
      );

      const subnet = discovery.getLocalSubnet();
      expect(subnet).toBe("192.168.1.0");
    });

    test("should return undefined when local IP is not found", () => {
      const mockNetworkInterfaces = {
        lo: [loopbackInterface],
      };

      vi.mocked(os.networkInterfaces).mockReturnValue(
        mockNetworkInterfaces as Record<string, os.NetworkInterfaceInfo[]>,
      );

      const subnet = discovery.getLocalSubnet();
      expect(subnet).toBeUndefined();
    });
  });

  describe("resolveDevice", () => {
    test("should return manual IP when set", async () => {
      const mockManualIP = "192.168.1.100";
      vi.mocked(getManualDeviceIP).mockReturnValue(mockManualIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockManualIP, port: 443 });
      expect(getSelectedDeviceIP).not.toHaveBeenCalled();
      expect(isCacheValid).not.toHaveBeenCalled();
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should return selected IP when set and no manual IP", async () => {
      vi.mocked(getManualDeviceIP).mockReturnValue(undefined);
      const mockSelectedIP = "192.168.1.101";
      vi.mocked(getSelectedDeviceIP).mockResolvedValue(mockSelectedIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockSelectedIP, port: 443 });
      expect(isCacheValid).not.toHaveBeenCalled();
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should return cached IP when valid and no manual or selected IP", async () => {
      vi.mocked(getManualDeviceIP).mockReturnValue(undefined);
      vi.mocked(getSelectedDeviceIP).mockResolvedValue(undefined);
      vi.mocked(isCacheValid).mockResolvedValue(true);
      const mockCachedIP = "192.168.1.102";
      vi.mocked(getCachedDeviceIP).mockResolvedValue(mockCachedIP);

      const result = await discovery.resolveDevice();
      expect(result).toEqual({ ip: mockCachedIP, port: 443 });
      expect(ssdp.broadcastDiscover).not.toHaveBeenCalled();
    });

    test("should discover device when no manual, selected, or cached IP", async () => {
      vi.mocked(getManualDeviceIP).mockReturnValue(undefined);
      vi.mocked(getSelectedDeviceIP).mockResolvedValue(undefined);
      vi.mocked(isCacheValid).mockResolvedValue(false);
      const mockDiscoveredDevice: WiiMDevice = { ip: "192.168.1.103", port: 443 };
      vi.mocked(ssdp.broadcastDiscover).mockResolvedValueOnce(mockDiscoveredDevice);
      vi.mocked(setCachedDeviceIP).mockResolvedValue(undefined);

      const result = await discovery.resolveDevice();
      expect(result).toEqual(mockDiscoveredDevice);
      expect(setCachedDeviceIP).toHaveBeenCalledWith(mockDiscoveredDevice.ip);
    });

    test("should throw error when no device found in discovery", async () => {
      vi.mocked(getManualDeviceIP).mockReturnValue(undefined);
      vi.mocked(getSelectedDeviceIP).mockResolvedValue(undefined);
      vi.mocked(isCacheValid).mockResolvedValue(false);
      vi.mocked(ssdp.broadcastDiscover).mockRejectedValue(new WiiMAPIError("DISCOVERY_FAILED", "No device found"));

      await expect(discovery.resolveDevice()).rejects.toThrow(expect.any(WiiMAPIError));
    });
  });
});
